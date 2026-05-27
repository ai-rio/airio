# Backend Persistence Plan

> **Status:** Draft, awaiting first slice implementation. Created 2026-05-27 from this session's research (3 specialist subagent reviews + Carlos's 4 locked decisions). Scope-cut decision 2026-05-27 (end of session): wire S1-S3 first as minimum viable proof, then re-evaluate. See "Current scope cut" section below before reading further phases.
>
> **Owner:** Carlos.
> **Spec scope:** how airio's product state persists, how the container exposes JSON API, how cross-project memory accumulates, and the per-screen wiring order.

---

## Current scope cut (Carlos, end-of-session 2026-05-27)

Wire S1-S3 first as **minimum viable proof of the stack**. Then re-evaluate.

**Rationale:** mocks aren't verification (wedge lock says "Verification UI IS the product"). Each unwired mock = guess at data shape. 3-screen wire = cheapest possible proof that R2 + D1 + Drizzle + audit_log + Queue all wire together without burning weeks on container work first. S1-S3 exercise Astro+D1+R2 only — no container call — so the proof isolates the persistence stack from the Python compute path.

**What this cut means concretely:**

- **In scope, this slice:** Phase 0 (prereqs) → Phase 1 (Drizzle schema for projects + sheets + audit_log + global_layer_dict + global_glyph_dict) → Phase 3 (Astro CRUD for projects/sheets/triagem + Queue consumer for global counters) → Phase 4 (S1 wire) → Phase 5 (S2 wire) → Phase 6 (S3 wire).
- **Deferred, this slice:** Phase 2 (container JSON API) → not needed for S1-S3 since none of them call the Python extractor. Phase 7+ (S4 scale through S7 quadro) → wait for S1-S3 proof first.
- **Schema scope cut:** Phase 1 migration includes ONLY the tables S1-S3 touch (projects, sheets, audit_log, global_layer_dict, global_glyph_dict). Tables for layer_mappings / glyph_overrides / quadros / quadro_rows / bom_rows / omissos / etc. defer to their wire phase (one migration per phase keeps diffs reviewable).

**Re-evaluation triggers after S1-S3 ships:**

- If wire surfaces nasty issues (Queue contention, audit_log volume, FK constraint pain) → pause forward wire, iterate on the persistence layer until smooth.
- If wire is smooth → continue to Phase 7 (S4 first container call) and validate the container path.
- If S9-S11 visual ports become a bottleneck for Carlos's dogfood flow → batch-port them visually before continuing to wire forward.

Do NOT pre-commit beyond S1-S3 wire. Decision deferred until proof in hand.

---

## Locked decisions (Carlos, 2026-05-27)

1. **Persistence stack = Cloudflare D1** (regional SQLite). KV rejected because joins are needed across project ↔ sheet ↔ layer_mapping + global counter tables.
2. **Schema tooling = Drizzle ORM + drizzle-kit**. Avoid hand-rolled SQL migrations. Schema in `db/schema.ts` → `drizzle-kit generate` diffs vs prior snapshot → emits `migrations/NNNN_*.sql` → `wrangler d1 migrations apply DB` runs it. Type-safe queries everywhere.
3. **Persist incrementally as Carlos walks** the 8-phase flow. Each HITL confirmation = POST to an Astro `/api/...` route. Browser never holds dirty state across screens. Audit trail = side-effect of every write.
4. **Container is stateless compute, Astro+D1 owns state.** Container never reads or writes D1. Astro forwards confirmed state inline to container calls (e.g. `/count` request body carries `layer_mappings` + `points_config` — container does not fetch them).
5. **PDFs live in R2** at `pdf/{project_id}/{sheet_id}.pdf`. Container endpoints take `r2_key` references, never multipart re-upload. Without this, container hibernation (5min sleep) re-uploads on every screen → cold-start UX death.
6. **Audit blobs live in R2** at `audit/{session_id}/{audit_id}.json`. D1 `audit_log` row carries only metadata + `r2_key`. SQLite 1MB row limit + JSON column scan kill the alternative.
7. **Counter UPSERTs (global dict tables) route via Cloudflare Queue**. Async batch flush. Global dicts are analytics/moat data, NOT shared with per-project CRUD hot path.
8. **Wire order = linear with the workflow.** S1 first, S2 next, ..., S7. Not "moat-first" (would be S6). Linear means Carlos can dogfood end-to-end as each slice ships.

---

## Open decisions (deferred to where they actually block)

| Decision | Blocks | Default if undecided |
|---|---|---|
| Glyph signature canonicalization strategy | Phase 9 (S5 Legenda wire) | Topological features hash (path_count + fill_state + line_count + normalized_bbox + aspect). Escalate to pHash on rasterized bitmap only if real Aeronet data shows fragmentation. |
| `quadro_rows.bitola_*` column type (REAL vs TEXT) | Phase 1 schema | Check `abnt.py` first — if it stores pure numbers (1.5, 2.5, ...), REAL; if composite labels ("2×2,5"), carry both `bitola_mm2 REAL` and `bitola_label TEXT`. |

---

## D1 schema sketch

> Source of truth lives in `db/schema.ts` (Drizzle TS DSL) once Phase 1 ships. The sketch below is the agreed shape for the first migration.

### Per-project tables

```text
projects(id, name, current_phase, status<EFETUANDO|LIBERADA>, created_at, updated_at)
sheets(id, project_id→projects, filename, page_index,
       kind<planta_forca|iluminacao|quadro|unifilar>,
       scale_denom, scale_set, layer_mapping_complete,
       quality_score, quality_red_flags_json, created_at)

-- S6: project-wide layer mapping (one decision applies to all sheets in project)
layer_mappings(id, project_id→projects, layer_name, kind,
               source<hist|glossary|intel|manual>,
               ignored, confirmed_at,
               UNIQUE(project_id, layer_name))
layer_occurrences(layer_mapping_id, sheet_id, element_count,
                  PK(layer_mapping_id, sheet_id))

-- S5: per-project glyph dict + within-project tag-once for non-geometric variants
glyph_overrides(id, project_id, glyph_signature, kind,
                sample_sheet_id, sample_page, confirmed_at, deleted_at,
                UNIQUE(project_id, glyph_signature))
glyph_tags(id, project_id, glyph_override_id, sheet_id,
           point_x REAL, point_y REAL,  -- NOT json
           tag_value, confirmed_at)

-- S7: extracted quadros (raw_json frozen on lock, structured rows are authoritative)
quadros(id, project_id, sheet_id, page_index, raw_json, locked, extracted_at)
quadro_rows(id, quadro_id, row_index,
            bitola_fase_mm2, bitola_neutro_mm2, bitola_terra_mm2,
            polaridade, aplicacao, eletroduto_pol, comprimento_m,
            tipo_inferred<alimentador|interno|reserva>, tipo_confidence, locked)

-- S9-S10: BOM materializes from counts + quadros + omissos
bom_rows(id, project_id, kind, descricao, quantidade, unit,
         sinapi_code, supplier_quote_cents, quote_source,
         source_breakdown_json, deleted_at)

-- S11: omissos
omissos(id, project_id, sheet_id, location_x REAL, location_y REAL,
        item_ref, status<flagged|query_sent|resolved_in|resolved_out|deferred>,
        resolved_bom_id, query_sent_at, cliente_replied_at, deferred_until)

-- HITL trust evidence — append-only, never delete
audit_log(id, session_id, project_id, ts, user, action,
          target_table, target_id, r2_key_before, r2_key_after, correlation_id)
```

### Global / moat tables (UPSERTs routed via CF Queue)

```text
global_layer_dict(layer_name, kind, confirmed_count, last_confirmed_at,
                  PK(layer_name, kind))
global_glyph_dict(glyph_signature, kind, confirmed_count, last_confirmed_at,
                  PK(glyph_signature, kind))
```

### Hardening locked in Phase 1

- **CHECK constraints on every enum** (Drizzle `text(name, { enum: [...] })` emits these automatically).
- **Indexes on all FK columns** (SQLite/D1 doesn't auto-index FKs). Critical composite: `audit_log(session_id, ts)` for trust-evidence reads.
- **Soft-delete columns:** `glyph_overrides.deleted_at`, `bom_rows.deleted_at`. `audit_log` = append-only forever.
- **Migration order DAG:** `projects → sheets → mappings/overrides/quadros/bom → occurrences/tags/rows/omissos → audit → globals`.

---

## Container JSON API surface

> Container = new `estimator/app_api.py` (do NOT extend `app_ele.py` HTML probe — different concerns). All endpoints take R2-key inputs, never multipart re-upload. Empty extraction = `200` with empty arrays, NOT error. Reserve `5xx` for unhandled Python crashes only. No `/v1/` prefix — internal service-bound API; defer versioning until breaking change.

| Endpoint | Wraps | Notes |
|---|---|---|
| `POST /extract/scale` | PyMuPDF text regex on titleblock | Returns `{ scale_denom, source<titleblock_text\|not_found>, evidence_text, evidence_bbox }`. `scale_denom: null + source: not_found` is 200, not error. |
| `POST /extract/layers` | PyMuPDF + `glossary.layer_kind()` | S6 INVENTORY ONLY. Returns per-layer `(name, element_count, color_rgb, has_lines, has_curves, glossary_kind?)`. Astro merges with D1 cross-project memory + intel.py LLM proposals server-side. Container does NOT do that merge. |
| `POST /extract/quadro` | `schedule.extract_schedule()` + `schedule.aggregate()` + **NEW 15-line wrapper** | **Python-side gap #1:** `schedule.py` does not produce per-row `tipo_inferred`. Wrapper rule: `comprimento_m != null` → `alimentador` else `interno`. Wrapper lives in container handler, not in `schedule.py`. |
| `POST /extract/quadro-counts` | `quadro_pontos.py` output reshape | Deterministic device-count spine — `points.py` reconciles against this. Was missing from first sketch; added on api-designer review. |
| `POST /count` | `points.py` + `ele.py` + `ele.metragem()` | Main wedge compute. Takes `layer_mappings` + `points_config` (BOTICARIO_POINTS shape) INLINE from Astro. Returns `pins[]` + `runs[]` + `pin_counts{}` + `run_totals{}`. **Python-side gap #2:** `ele.metragem()` discards segment polylines; needs `return_segments=True` param OR parallel extraction so S9 overlay can render colored runs. |
| `POST /extract/glyphs` | (S5 moat-deferred) | Returns 501 stub: `{ status: "not_implemented", planned_screen: "S5" }`. Reserves the path without locking shape prematurely. |

### Coordinate system declared

All responses emit coordinates in **PDF user-space points, top-left origin** (raw from `fitz`). Every response includes `page_size_pt: [w, h]` so the UI normalizes to its canvas coordinate system. Container does NOT normalize.

### Two-sided instrumentation (non-negotiable)

Container cold-start (boot + uvicorn + PyMuPDF import = 2-6s after 5min hibernation) is invisible from Astro Worker's perspective without explicit logging on both sides:

- Astro Worker logs `{event: "estimator_fetch_start"|"estimator_fetch_done", endpoint, ts, duration_ms, correlation_id, status}` around every `env.ESTIMATOR.fetch()` call.
- Container Python logs `{event: "container_request_start"|"container_request_done", endpoint, ts, duration_ms, correlation_id}` per uvicorn request.
- Delta between Astro `fetch_start` and container `request_start` = container cold-start cost. Without both sides, debugging "Glyphs screen is slow" is blind.

---

## Python-side gaps (block end-to-end wire)

| # | What | Why required | Where to fix |
|---|---|---|---|
| 1 | `schedule.py` does not produce per-row `tipo_inferred` | S7 needs per-row alimentador/interno flag for Carlos to confirm/flip each circuit | 15-line wrapper in container handler. NOT in `schedule.py` itself (Carlos's "library-first" rule keeps the analyzer pure). |
| 2 | `ele.metragem()` discards segment polylines after measuring | S9 infra overlay needs polylines to render colored runs on the canvas | Add `return_segments=True` param to `ele.metragem()` OR parallel extraction path in container handler. |

---

## Wire order (linear, each phase = dogfood the new layer before adding the next)

| Phase | Screen | New layer exercised | Container call |
|---|---|---|---|
| 0 | (prereqs) | R2 bucket + D1 binding + Drizzle scaffold | n/a |
| 1 | (schema) | `db/schema.ts` + first migration + `wrangler types` | n/a |
| 2 | (container API) | `app_api.py` with all endpoints + 2 Python gaps fixed + two-sided instrumentation | builds the wire |
| 3 | (Astro CRUD + Queue) | per-screen `/api/projects/...` routes + audit_log middleware + Queue consumer for global counters | n/a |
| 4 | **S1 · Cadastro** (`/projects/novo`) | Astro routes + D1 writes + ksuid PK + audit_log | none |
| 5 | **S2 · Documentos** (PDF upload) | R2 PUT + signed URLs + multi-PDF + per-sheet rows | none |
| 6 | **S3 · Triagem** (tag sheets) | per-sheet kind update + D1 patch + idempotency | none |
| 7 | **S4 · Escala** | first container call (`POST /extract/scale`) | yes |
| 8 | **S6 · Camadas** (inside Preparação) | `POST /extract/layers` + cross-project memory + global counter Queue | yes |
| 9 | **S5 · Legenda** | glyph signature canonicalization decision needed FIRST | yes — vision Intel |
| 10 | **S7 · Quadro de Cargas** | `POST /extract/quadro` + per-row `tipo_inferred` wrapper | yes |
| 11+ | S8 / S9 / S10 / S11 | dogfood-driven order |

Between each phase: dogfood the new layer on a real Aeronet PDF. Surface what breaks. Iterate before adding the next.

---

## Risks surfaced by specialist review

| Risk | From | Mitigation locked |
|---|---|---|
| Container hibernation re-uploads PDF every screen → 3-8s cold parse × N screens = death | architecture-advisor | R2 staging at `pdf/{project_id}/{sheet_id}.pdf`. Container takes references. |
| Audit blobs in D1 hit 1MB row limit + JSON column scan | architecture-advisor | Blobs to R2; D1 carries metadata + r2_key only. |
| Synchronous counter UPSERTs serialize on D1 single-writer + compete with hot CRUD | architecture-advisor | Async via CF Queue. Per-project CRUD = hot path; globals = analytics. |
| Glyph signature noise fragments global counter | architecture-advisor | Canonicalization strategy decided BEFORE Phase 9 wire. Default = topological-features hash. |
| Container cold-start invisible from Astro side | architecture-advisor | Two-sided instrumentation on `env.ESTIMATOR.fetch()`. Required, not optional. |
| `/extract/layers` collapses two different call-times (S6 inventory vs S9 count) | api-designer | Split: `/extract/layers` (S6, no config needed) vs `/count` (S9, takes confirmed config inline). |
| Missing endpoint for `quadro_pontos.py` (deterministic count spine) | api-designer | `POST /extract/quadro-counts` added to surface. |
| `schedule.py` per-row classification gap | api-designer | 15-line wrapper in container handler — `schedule.py` stays pure. |
| `ele.metragem()` polyline discard gap | api-designer | `return_segments=True` param OR parallel extraction. Required before S9 overlay renders. |
| SQLite no auto-index on FK columns → JOIN-heavy layer query table-scans | database-administrator | Every FK column gets explicit index. Composite `audit_log(session_id, ts)`. |
| `quality_red_flags_json` / `source_breakdown_json` acceptable as JSON | database-administrator | Provenance only, not searched. Keep. |
| `point_xy_json` / `location_xy_json` should NOT be JSON | database-administrator | Split into `_x REAL, _y REAL`. No spatial query possible otherwise. |
| `quadros.extracted_json` + `quadro_rows` = dual-source-of-truth drift | database-administrator | Rename `raw_json`, replay-only (frozen when `locked=1`). |
| Enum columns silently accept garbage strings without CHECK | database-administrator | CHECK constraints on every enum. Drizzle `text(name, { enum: [...] })` emits automatically. |
| `bitola_*` typed TEXT but carries numeric mm² (1.5, 2.5, ...) | database-administrator | Open decision pending `abnt.py` review. Default proposal: `bitola_mm2 REAL` + optional `bitola_label TEXT` for composites. |

---

## Guardrails

- `db/schema.ts` = single source of truth. Direct edits to `migrations/*.sql` (except rename ALTER fixups) banned.
- Generated migrations committed alongside schema.ts changes. Never separately.
- Pre-commit: `bunx drizzle-kit generate` + tree-clean check to catch "schema edited, migration not regenerated" footgun.
- Container = stateless. If a container endpoint needs to "remember" something across calls, surface that to Astro + D1 instead. Hibernation will erase any in-process state anyway.
- Every `/api/...` write triggers two side-effects: append `audit_log` row + write R2 blob (synchronous) + enqueue global counter UPSERT (async via Queue). Pattern enforced via middleware, not per-handler.
- Empty extraction (no layers, no scale, no tables) = `200` with empty arrays. `5xx` reserved for unhandled crashes.

---

## Cross-references

- `CLAUDE.md` — hard rules, pre-build gate, anti-sycophancy gate, repo structure.
- `docs/spec/screen-inventory.md` — 19 screens + 5 state models. Screen IDs (S1-S19) referenced throughout this plan.
- `docs/spec/takeoff-workflow.md` — Carlos's 11-step verbatim workflow.
- `docs/spec/design-tokens.md` — UI tokens; `accent #ea580c` orange-discipline rule applies to all new UI in the wire phases.
- `.claude/rules/ai-output-handling.md` — validate AI outputs (container's `intel.py` calls).
- `.claude/rules/observability.md` — structured logging + correlation IDs + HITL audit trail rules. **This plan's two-sided instrumentation requirement extends the rule.**
- `estimator/ARCHITECTURE.md` — Python analyzer architecture (2 halves: planta geometry + cabos table; 1 reconciler). Read first for any Python work in Phase 2.

---

## Session continuity

This plan exists so future Claude sessions can resume the backend wire without re-doing the research. Read on session start if any backend / persistence work is on the table.

Pointer in memory: `~/.claude/projects/-home-carlos-apps-airio/memory/project_backend_persistence_plan.md` — index entry + non-obvious context.
