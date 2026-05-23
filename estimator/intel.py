"""
Stage-1 INTEL — Claude reads a drawing's legend and emits the counting ruleset.

This is the half that's hard to automate: mapping "what label/layer means what
device + spec" for a non-standard projetista legend. Stage-2 maths (count.py)
then applies the ruleset deterministically. Replaces the hand-tuned RULES.

Design:
  - Routed through the `claude -p` CLI (not the anthropic SDK) so it authenticates
    with the user's Claude subscription OAuth — no billed API key. Model: sonnet.
  - The JSON Schema is handed to the model in the system prompt; the CLI has no
    output_config, so shape is enforced by _validate() (output is untrusted anyway).
  - Output validated; on any failure caller falls back to count.py's hardcoded RULES.

Input fed to Claude (cheap, text-only — no vision needed for counting):
  - legend/title-block text, the CAD layer names, and a token-frequency table.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
from collections import Counter
from pathlib import Path

import fitz

DEFAULT_MODEL = "sonnet"   # CLI alias; routed through the user's Claude subscription

# Strict JSON schema for the ruleset Claude returns. Mirrors count.py's DeviceRule.
RULESET_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "devices": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "key": {"type": "string"},
                    "label": {"type": "string"},
                    "match_token": {"type": "string"},
                    "match_kind": {"type": "string", "enum": ["exact", "regex"]},
                    "subtype_tokens": {"type": "array", "items": {"type": "string"}},
                    "spec": {"type": "string"},
                    "subtype_specs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "subtype": {"type": "string"},
                                "spec": {"type": "string"},
                            },
                            "required": ["subtype", "spec"],
                        },
                    },
                },
                "required": ["key", "label", "match_token", "match_kind",
                             "subtype_tokens", "spec", "subtype_specs"],
            },
        },
        "pipe_layer": {"type": "string"},
        "scale_denom": {"type": "integer"},
        "notes": {"type": "string"},
    },
    "required": ["devices", "pipe_layer", "scale_denom", "notes"],
}

INSTRUCTIONS = """\
You read Brazilian low-voltage / fire-protection construction drawings (plantas) \
and extract a COUNTING RULESET so software can tally devices and pipe from the \
PDF's own text + CAD layers. You are given: the legend/title-block text, the list \
of CAD layer names, and a frequency table of short text tokens that appear on the \
sheet (these are the device callouts).

Produce one ruleset entry per countable device type. For each device:
- match_token: the exact short token that appears ONCE per device instance on the \
plan (e.g. an extintor callout carries "6Kg"; a hidrante carries a tag like \
"HID-18"). Pick the token whose frequency ≈ the real device count. Prefer a stable \
recurring callout token over a description word.
- match_kind: "exact" if match_token is a literal string; "regex" if instances vary \
by a number/suffix (then match_token is a Python regex, e.g. "HID-\\\\d+").
- subtype_tokens: words that split the count by type when they sit in the callout \
(e.g. ["ABC","CO2"] for extintores). Empty if no subtypes.
- spec: the material specification from the legend, for procurement (pt-BR, concise).
- subtype_specs: per-subtype spec overrides when subtypes differ materially.

Signage/marking is its OWN device type, never an attribute of equipment. BR fire/safety \
legends define signs by numeric codes (e.g. "CÓDIGO 23", "24A"). Emit one entry per \
signage code the legend defines, match_token = the bare code as it appears in plan \
callouts. Do NOT assume signage is 1:1 with its equipment — there are usually extra \
wall/pillar/floor signs, so the sign count normally EXCEEDS the equipment count. Never \
fold signage into an equipment's spec. If a bare numeric code risks colliding with \
unrelated numbers on the sheet, still emit it and flag the collision in notes.

Emit a signage code ONLY if it is actually PLACED on THIS sheet. Tests: (a) its token \
frequency must plausibly equal a real device count — a code appearing ~once is legend-only, \
skip it; (b) exclude codes the legend scopes to OTHER areas (e.g. "sinalização de piso \
apenas para garagens/depósitos" on a pavimento sheet) or that occur only in the legend \
table; (c) bare numeric codes frequently collide with stair-step numbering or dimension \
text — when a code's occurrences look like a counting sequence ("28 27 26 25 24 23"), it \
is stairs, not signage. Prefer false-omission to inventing signage from collisions.

Also return:
- pipe_layer: the CAD layer name carrying the pipe/tubulação geometry (look for \
names like P-PIPE, TUB, HID, SPK). "" if none obvious.
- scale_denom: the plot scale denominator read from the sheet (e.g. 75 for 1:75); \
0 if not stated in the text.
- notes: one line on anything ambiguous a human should confirm.

Only include devices you can justify from the legend + tokens. Do not invent counts."""


def extract_intel_input(pdf_path: str, page_index: int = 0, top_n: int = 60) -> dict:
    """Pull the cheap text signals Claude needs: legend text, layers, token freqs."""
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    text = page.get_text("text")
    layers = sorted({i["name"] for i in doc.get_ocgs().values()}) if doc.get_ocgs() else []
    # token frequency over short callout-like tokens (letters/digits/dashes, len<=8)
    toks = [w[4] for w in page.get_text("words")]
    freq = Counter(t for t in toks if re.fullmatch(r"[A-Za-z0-9ºÇ/\-:]{1,8}", t))
    doc.close()
    return {
        "legend_text": text[:6000],
        "layers": layers,
        "token_freq": freq.most_common(top_n),
    }


def derive_ruleset(pdf_path: str, page_index: int = 0, model: str = DEFAULT_MODEL) -> dict:
    """Call Claude via the `claude -p` CLI → validated ruleset dict.

    Routes through the CLI (not the anthropic SDK) so it authenticates with the
    user's Claude subscription OAuth — no billed API key required. Raises on hard
    failure so the caller can fall back to count.py's hardcoded RULES.

    NOTE (ToS / portability): the subscription licenses interactive Claude Code use;
    fine for local demo/discovery, but a shipped/CI build (e.g. on Sergio's machine)
    must switch to a billed sk-ant- key + the anthropic SDK.
    """
    intel = extract_intel_input(pdf_path, page_index)
    user_payload = (
        "CAD LAYERS:\n" + ", ".join(intel["layers"]) + "\n\n"
        "TOKEN FREQUENCIES (token, count):\n"
        + "\n".join(f"{t}: {n}" for t, n in intel["token_freq"]) + "\n\n"
        "LEGEND / SHEET TEXT:\n" + intel["legend_text"]
    )
    system = (
        INSTRUCTIONS
        + "\n\nReturn ONLY a single JSON object (no markdown fences, no prose) that "
        "conforms to this JSON Schema:\n" + json.dumps(RULESET_SCHEMA)
    )
    # Strip ANTHROPIC_API_KEY so the CLI uses subscription OAuth, never a stray key.
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        proc = subprocess.run(
            ["claude", "-p",
             "--model", model,
             "--output-format", "json",
             "--system-prompt", system,
             "--disallowed-tools",
             "Bash Read Edit Write Glob Grep WebFetch WebSearch Task TodoWrite"],
            input=user_payload, text=True, capture_output=True,
            cwd="/tmp",        # avoid project CLAUDE.md auto-discovery noise
            env=env, timeout=300,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("claude CLI timed out after 300s")  # clean log; caller falls back
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed ({proc.returncode}): {proc.stderr[-500:]}")
    env_out = json.loads(proc.stdout)
    if env_out.get("is_error") or env_out.get("subtype") != "success":
        raise RuntimeError(f"claude CLI error: subtype={env_out.get('subtype')}")
    raw = env_out["result"].strip()
    if raw.startswith("```"):                       # defensive: strip ```json ... ```
        raw = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", raw).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:                    # salvage the JSON object from any prose
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise RuntimeError(f"no JSON in CLI result: {raw[:200]!r}")
        data = json.loads(m.group(0))
    _validate(data)
    u = env_out.get("usage", {})
    data["_usage"] = {
        "input": u.get("input_tokens", 0),
        "output": u.get("output_tokens", 0),
        "cache_read": u.get("cache_read_input_tokens", 0),
        "cost_usd": env_out.get("total_cost_usd", 0),
        "model": model,
    }
    return data


def _validate(data: dict) -> None:
    """Treat AI output as untrusted: assert shape before count.py consumes it."""
    if not isinstance(data.get("devices"), list) or not data["devices"]:
        raise ValueError("ruleset has no devices")
    for d in data["devices"]:
        for k in ("key", "label", "match_token", "match_kind"):
            if not isinstance(d.get(k), str) or not d[k]:
                raise ValueError(f"device missing {k}: {d}")
        if d["match_kind"] == "regex":
            re.compile(d["match_token"])  # ensure the regex is valid before use


if __name__ == "__main__":
    import sys
    model = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL
    rs = derive_ruleset(sys.argv[1], model=model)
    print(json.dumps(rs, indent=2, ensure_ascii=False))
