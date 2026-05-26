# Observability Requirements Rule

Include sufficient logging and metrics for the takeoff pipeline (PDFs → analyzers → BOM → Astro UI) so problems are diagnosable without re-running the whole stack.

## Requirements

1. **Structured logging**: JSON logs (or `print(json.dumps(...))` for analyzer CLIs) for key events:
   - Takeoff session start / per-analyzer completion / final report emission
   - External API calls (Anthropic SDK or `claude -p` CLI in `intel.py` / `intel_points.py`) — model, prompt version, latency, token count, validation pass/fail
   - HITL events (scale confirmation, region polygon saved, AC pin tagged, polaridade override)
   - Errors and exceptions (full stack traces in dev; sanitized + correlation ID in prod)

2. **Performance metrics**: Track and surface
   - `find_tables` time + table count per PDF
   - `get_drawings` time + path/curve counts per layer
   - Total pipeline latency from PDF upload → BOM emission
   - LLM call latency + tokens (Intel vision + text)
   - pytest suite total time (informational; the slow run is real not hung — ~7 min)

3. **Correlation IDs**: Generate one UUID per takeoff session, propagate through Worker → Container → response. Lets a buyer report "this run was wrong" with a single ID.

4. **HITL audit trail**: Every Carlos-side override (scale, layer kind, region polygon, AC tag, drop, polaridade) gets logged with timestamp + session ID + user. The trail is the "why this number" answer when procurement questions the BOM.

5. **Validation outcomes**: Every analyzer line that goes into the BOM emits its status (proven / R&D / hidden) + the Δ vs the oracle if one exists. The takeoff report can then render only PROVEN lines (per the scope-discipline rule); R&D rows stay in the log for debugging but don't ship to the buyer.

6. **Privacy + retention**: Don't log raw PDF contents or paths containing client names without redaction. Carlos's bid docs may carry NDA-sensitive content. Retain operational logs ≥30 days; HITL audit trail per session indefinitely (it's the trust evidence).

## Why this matters

- Carlos needs to trust the tool. Trust = "I can see exactly which inputs produced this BOM and audit any line." Observability IS the trust evidence.
- Slow analyzer runs masked as hangs (see the recent observer false-positive) waste hours; latency metrics surface the real picture.
- LLM cost runs away silently without per-call metrics; log it.
- Distribution / paid SaaS will need usage metrics for billing (per-takeoff or per-PDF tiers). Build the hooks now even if billing isn't wired.

## Implementation hints

- Python analyzer side: a thin logging helper that wraps `json.dumps({"event": ..., "session_id": ..., "ts": ..., ...})` and prints. Don't pull in heavy frameworks. CF Container will pipe stdout to CF Logs.
- Worker side: standard `console.log({...})`, picked up by CF tail / Workers Logpush.
- Astro side: surface the correlation ID in the UI footer so Carlos can paste it into a bug report.
- Tests: assert the right events fire in the right order on a known PDF (a smoke integration test, not a paranoid count).

When the Astro UI lands, the HITL events become the source of truth for the audit trail — wire them through from frontend to logging from day one, not bolted on later.
