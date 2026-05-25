"""Stage-1 INTEL for device POINTS — vision reads the drawing's symbology legend and emits
the device map (which symbol = which device, its spec, and how many GLYPH VARIANTS it has).

Why vision (not the text-token intel.py): electrical device points are SYMBOLS with no text
callout, and the symbology legend ("LEGENDA GRÁFICA") is drawn as OUTLINED VECTOR text +
sample glyphs — get_text() can't read it. The legend is where the project DEFINES its own
vocabulary; reading it is what lets the tool configure itself per project instead of a human
hand-coding BOTICARIO_POINTS, and it resolves the semantic gaps the deterministic detector
can't (e.g. "iluminação de emergência" = TWO glyphs: aclaramento + seta/pictograma).

This is INTEL → it PROPOSES; the human CONFIRMS (same trust model as the scale gate). Output
is untrusted (validated). LLM routing mirrors schedule.py B5: ANTHROPIC_API_KEY → anthropic
SDK (billed, deployable); else the `claude` CLI (subscription OAuth, free dev default).

v1 scope: read the legend → symbology map (class / spec / count_as_point / variants). Mapping
each entry to its CAD layer + auto-deriving detector params = v2 (the legend sample glyphs sit
on the device layers, so it's recoverable). See BOTICARIO_VALIDATION_RESULTS.md.

Usage:
    python intel_points.py <plan.pdf> [--model sonnet] [--page N] [--keep-png]
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import tempfile

import fitz

DEFAULT_MODEL = "sonnet"
_SDK_MODELS = {"sonnet": "claude-sonnet-4-6", "opus": "claude-opus-4-7", "haiku": "claude-haiku-4-5-20251001"}

POINT_CLASSES = ["tomada", "luminaria", "interruptor", "emergencia", "aterramento"]

_SCHEMA = {
    "type": "object",
    "properties": {
        "symbology": {"type": "array", "items": {"type": "object", "properties": {
            "label": {"type": "string"},                       # legend description, verbatim
            "klass": {"type": "string"},                       # tomada|luminaria|interruptor|emergencia|aterramento|infra|cabo|annotation|other
            "spec": {"type": "string"},                        # material/spec for procurement
            "count_as_point": {"type": "boolean"},             # a countable device POINT?
            "variant_of": {"type": "string"},                  # same klass, distinct glyph (e.g. emergencia aclaramento vs seta)
        }, "required": ["label", "klass", "count_as_point"]}},
        "point_devices": {"type": "object"},                   # klass -> [variant labels]
        "notes": {"type": "string"},
    },
    "required": ["symbology", "point_devices", "notes"],
}

_SYSTEM = """\
You read the SYMBOLOGY LEGEND ("LEGENDA GRÁFICA" / "SIMBOLOGIA") of a Brazilian low-voltage \
electrical drawing and emit a structured map so software knows what each drawn symbol MEANS. \
The image is the legend table: each row = a sample symbol + its description (pt-BR).

For EACH legend row emit a `symbology` entry:
- label: the description text, verbatim (pt-BR).
- klass: classify into ONE of: tomada (outlet/receptacle), luminaria (light fixture), \
interruptor (switch), emergencia (emergency/exit light — "luminária de emergência", \
balizamento, aclaramento, seta/pictograma), aterramento (earthing — BES, malha, haste), \
infra (eletroduto, perfilado, eletrocalha, leito, busway — linear housing), cabo \
(conductor/cable), annotation (circuit number, gauge note, leader, section mark), other.
- spec: the material/rating spec for procurement, concise (e.g. "10A/250V, caixa PVC 4x2", \
"bloco autônomo LED 2h").
- count_as_point: true ONLY if it is a discrete device counted as a POINT (tomada, luminaria, \
interruptor, emergencia, aterramento). false for infra/cabo/annotation/other.
- variant_of: if this row is the SAME device class as another row but a DISTINCT glyph (e.g. \
"interruptor simples" vs "interruptor paralelo"; emergência "aclaramento" vs "c/ seta e \
pictograma"; "tomada de piso" vs "tomada baixa"), set this to the klass; else "".

CRITICAL — capture EVERY variant. A device class often has SEVERAL glyphs (e.g. iluminação de \
emergência is commonly TWO: aclaramento AND com seta/pictograma; interruptor up to 5: simples, \
2 seções, condulete, paralelo, paralelo condulete; tomada: de piso AND baixa). The whole point \
is to find variants a single-glyph detector would miss. Do not collapse them.

Then `point_devices`: an object mapping each point klass present -> the list of its variant \
labels (so the caller knows how many distinct glyphs to detect per device). `notes`: one line \
on anything ambiguous a human should confirm. Read ONLY what the legend shows; do not invent."""


def render_legend(pdf_path: str, out_png: str, page_index: int = 0, zoom: float = 2.6) -> bool:
    """Render the legend block, anchored to the 'LEGENDA'/'SIMBOLOGIA' text (NOT a hardcoded
    box — that'd be a per-sheet cheat). Returns False if no legend anchor found.

    NOTE (v1 limit): the rotation + expand-direction are tuned to this sheet family (carimbo
    bottom-right, page rotation 270). v2 must derive orientation from the legend's own layout."""
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    rot = page.rotation
    page.set_rotation(0)
    anchor = None
    for w in page.get_text("words"):
        if re.fullmatch(r"LEGENDA|SIMBOLOGIA", w[4], re.I):
            anchor = w
            break
    if anchor is None:
        return False
    ax0, ay0 = anchor[0], anchor[1]
    # legend table sits left-of + below the header on this sheet family; clip to page edge
    clip = fitz.Rect(max(0, ax0 - 450), max(0, ay0 - 80), page.rect.width, page.rect.height)
    prerot = 270 if rot in (270, 90) else 0
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom).prerotate(prerot), clip=clip, alpha=False)
    pix.save(out_png)
    return True


def _parse_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise RuntimeError(f"no JSON in result: {raw[:200]!r}")
        return json.loads(m.group(0))


def _validate(data: dict) -> None:
    """AI output is untrusted — assert shape before anything consumes it."""
    if not isinstance(data.get("symbology"), list) or not data["symbology"]:
        raise ValueError("intel returned no symbology rows")
    for r in data["symbology"]:
        if not isinstance(r.get("label"), str) or not isinstance(r.get("klass"), str):
            raise ValueError(f"bad symbology row: {r}")
    data.setdefault("point_devices", {})
    data.setdefault("notes", "")


def read_legend(png: str, model: str = DEFAULT_MODEL) -> dict:
    """Vision call → validated symbology dict. Routes by ANTHROPIC_API_KEY (SDK vs CLI)."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        import anthropic
        with open(png, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode()
        msg = anthropic.Anthropic().messages.create(
            model=_SDK_MODELS.get(model, model), max_tokens=4000, system=_SYSTEM,
            messages=[{"role": "user", "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}},
                {"type": "text", "text": "Read this electrical symbology legend and emit the JSON map "
                                         "(schema: " + json.dumps(_SCHEMA) + "). JSON only."}]}],
        )
        raw = "".join(b.text for b in msg.content if getattr(b, "type", None) == "text")
        data = _parse_json(raw)
        data["_usage"] = {"input": msg.usage.input_tokens, "output": msg.usage.output_tokens,
                          "model": _SDK_MODELS.get(model, model)}
    else:
        prompt = (f"Read this electrical symbology legend image and emit the JSON map. "
                  f"Schema: {json.dumps(_SCHEMA)}. JSON only, no prose. Image: @{png}")
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        proc = subprocess.run(
            ["claude", "-p", prompt, "--model", model, "--output-format", "json",
             "--system-prompt", _SYSTEM, "--allowedTools", "Read"],
            text=True, capture_output=True, cwd=tempfile.gettempdir(), env=env, timeout=420,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"claude CLI failed ({proc.returncode}): {proc.stderr[-400:]}")
        env_out = json.loads(proc.stdout)
        if env_out.get("is_error") or env_out.get("subtype") != "success":
            raise RuntimeError(f"claude CLI error: subtype={env_out.get('subtype')}")
        data = _parse_json(env_out["result"])
        u = env_out.get("usage", {})
        data["_usage"] = {"input": u.get("input_tokens", 0), "output": u.get("output_tokens", 0),
                          "cost_usd": env_out.get("total_cost_usd", 0), "model": model}
    _validate(data)
    return data


def derive(pdf_path: str, model: str = DEFAULT_MODEL, page_index: int = 0, keep_png: bool = False) -> dict:
    png = os.path.join(tempfile.gettempdir(), f"legend_{os.getpid()}.png")
    if not render_legend(pdf_path, png, page_index):
        raise RuntimeError("no LEGENDA/SIMBOLOGIA anchor found on the sheet")
    try:
        return read_legend(png, model)
    finally:
        if not keep_png and os.path.exists(png):
            os.remove(png)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--page", type=int, default=0)
    ap.add_argument("--keep-png", action="store_true")
    args = ap.parse_args()
    data = derive(args.pdf, args.model, args.page, args.keep_png)
    print("# Intel — symbology read from the legend\n")
    for r in data["symbology"]:
        pt = "●" if r.get("count_as_point") else " "
        var = f"  (variante de {r['variant_of']})" if r.get("variant_of") else ""
        print(f" [{pt}] {r['klass']:11} {r['label'][:70]}{var}")
    print("\n# Point devices (klass -> variants the detector must cover):")
    for k, vs in data.get("point_devices", {}).items():
        print(f"  {k:12} {len(vs)} variant(s): {vs}")
    print(f"\nnotes: {data.get('notes','')}")
    print(f"usage: {data.get('_usage')}")


if __name__ == "__main__":
    main()
