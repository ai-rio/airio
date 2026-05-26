# AI Output Handling Rule

Treat AI-generated content as untrusted input. All outputs from AI services (Anthropic SDK or `claude` CLI subscription via `intel.py` / `intel_points.py`, or any future LLM call) must be validated and sanitized before use.

## Requirements

1. **Schema validation**: AI outputs (JSON device maps, ruleset proposals, legend reads) must pass a strict schema check before being trusted. See `intel_points._validate()` and `intel._validate()` for the pattern — schema in code, validator that raises on any mismatch.
2. **Fallback path**: On any validation failure, fall back to the hand-coded config (`BOTICARIO_POINTS` in `points.py`, `glossary.py`, `header_glossary.py`). Never silently accept malformed AI output as config.
3. **Routing isolation**: `ANTHROPIC_API_KEY` → Anthropic SDK (billed, deployable). Else → `claude -p` CLI (subscription OAuth, free in dev). Same pattern across `intel.py` (text) and `intel_points.py` (vision). Don't pin to one mode; the runtime picks based on env.
4. **Sanitization at the UI boundary**: Any AI string surfaced in the Astro UI must be escaped (React auto-escaping is enough; do NOT inject as `dangerouslySetInnerHTML`). Legend nomenclature lifted verbatim from the project = still untrusted, still escaped.
5. **Prompt versioning**: When a prompt changes, bump a version string (`PROMPT_VERSION` constant in the calling module). Log which version produced each output so a bad batch can be traced + replayed.
6. **Cost + telemetry**: Log model, token count, latency, and the output's validation result on every call. Costs add up at scale (Boticário-size PDFs, vision modal); make them visible.

## Why this matters

- Prevents injection (XSS, prompt-injection cascade) from malicious or malformed AI output rendered in the UI.
- Maintains a clean separation: AI proposes, deterministic code disposes. The deterministic analyzers (`points.py`, `quadro_pontos.py`, `ele.py`) must never be reconfigured by un-validated AI output.
- Provides traceability for the HITL trust model: Carlos can see "this number came from prompt v2, model claude-sonnet-4-6, validated against schema vX" and decide if he trusts it.
- Keeps the option of cheaper providers / local models open — schema-validated outputs are model-agnostic.

## Implementation examples

- `estimator/intel_points.py:_validate()` — JSON schema enforcement for the vision-Intel device map.
- `estimator/intel.py:_validate()` — same pattern for the text-Intel ruleset.
- `estimator/schedule.py` — find_tables succeeds → Intel never invoked (the fallback that never triggers is still a fallback; keep it).

When the Astro UI lands, mirror this on the frontend: never trust a backend-returned AI field as raw HTML; escape on render.
