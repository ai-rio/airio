# Development Workflow Rule — airio Phase 6+

Governs how new wire phases (S3 Triagem → S7 Quadro de Cargas → S8+) are built. Read before any backend / Astro slice. Lifts the parts that fit airio from statichost's `dev-workflow.md`; deliberately **does not** copy TDD-first or Hono-route-module mandates (wrong loop for this product — see §1).

## 1. The test for a wire phase = dogfood + audit_log, NOT vitest

Per the wedge lock (`project_estimator_wedge_and_product_lock`) + 5-day-drift memory (`feedback_5day_drift_from_wedge_lock`): **Verification UI IS the product. Carlos dogfooding on a real Aeronet PDF IS the gate.** Vitest harness setup (`@cloudflare/vitest-pool-workers` + miniflare bindings) = a slice of its own; ROI bad pre-customer.

Concrete gate for a new wire slice (e.g. S3 Triagem, S4 Escala):

1. **curl smoke test** of every new endpoint (POST/GET/PATCH) with one real input + one malformed input. Returns expected status + body shape. Captured in commit message or `.agents/handoff/`.
2. **Audit trail verification:** `SELECT * FROM audit_log WHERE project_id = ? ORDER BY ts` after the smoke run shows one row per write with non-null `r2_key_after`. The audit trail IS the proof; no audit row = no ship.
3. **SSR re-render check:** load the page in the browser (or `curl` the HTML) after the mutation, confirm the new state is visible. Optimistic-only UI is fine if the next page-load matches.
4. **Dogfood on at least one real Aeronet PDF** before declaring done — not just synthetic curl.

If a phase later proves bug-prone enough to justify a vitest harness, write the harness then. Not before.

## 2. Migration discipline (D1 + Drizzle)

One migration per schema change. Schema is `db/schema.ts` (single source of truth). Workflow:

1. Edit `db/schema.ts`.
2. `bunx drizzle-kit generate` → emits `migrations/NNNN_<auto-name>.sql`.
3. **Inspect the generated SQL** — rename detection produces destructive `DROP COLUMN` + `ADD COLUMN` pairs. Hand-edit to `ALTER TABLE ... RENAME COLUMN` if a rename was intended.
4. `bunx wrangler d1 migrations apply DB --local` (binding name is `DB` per `wrangler.jsonc`; **DB ID** is the airio-db UUID `c280b5da-...`, not the legacy Tagsmith one — `rm -rf node_modules/.cache/wrangler` if you hit account confusion).
5. Smoke-curl the affected endpoint to confirm shape after apply.
6. Commit `db/schema.ts` + the new migration **together** — never separately. Tree-clean check before commit catches the "schema edited, migration not regenerated" footgun.

Rules:

- **Additive only** when possible. `ALTER TABLE ... ADD COLUMN` always safe; `DROP COLUMN` requires explicit Carlos approval (data loss).
- **Never modify a shipped migration.** Add a new one.
- **Always apply locally before writing code against the new shape.** Don't implement an endpoint that touches a column the local D1 doesn't have yet — `wrangler dev` will silently 500.
- **Drizzle TS enums are type-only.** Always pair with a `check()` constraint for DB-level enforcement (pattern: `sheets.kind`, `projects.status`).

## 3. Quality gate before commit

For any commit touching `src/`, `db/`, or `migrations/`:

```bash
bunx astro check     # typecheck (catches Astro frontmatter type drift + bad imports)
bun run build        # full Astro+Worker build (catches CF-specific bundle errors)
```

Both must pass. `astro check` ≈ 5-10s; `build` ≈ 30s. Run before `git commit` — pre-commit hook welcome but not yet wired.

**Lint gap:** no biome/eslint configured yet. Add when first lint-class bug ships. Not a blocker for Phase 6.

## 4. Specialist agent dispatch (airio-tailored)

No general-purpose agents for implementation. Pick the narrowest fit. Orchestrator decomposes → dispatches → checks gates → loops.

| Task | Agent |
|---|---|
| Astro page / layout / component | `voltagent-core-dev:frontend-developer` |
| Astro API endpoint (`src/pages/api/...`) | `voltagent-core-dev:backend-developer` |
| Drizzle schema + migration design | `voltagent-infra:database-administrator` |
| Python estimator analyzer (`estimator/*.py`) | `cc-polymath:polyglot-engineer` |
| Container handler wrapper (S7 `tipo_inferred`, S9 polylines) | `cc-polymath:polyglot-engineer` |
| Wrangler / CF Workers / R2 / Queues config | `cc-polymath:architecture-advisor` |
| Code review (post-implementation pass) | `voltagent-qa-sec:code-reviewer` |
| Debug a failing curl / runtime error | `voltagent-qa-sec:debugger` |
| API contract / endpoint shape design | `voltagent-core-dev:api-designer` |
| Architecture tradeoffs / multi-service design | `cc-polymath:architecture-advisor` |
| Read-only codebase exploration | `Explore` |
| Deep multi-file analysis | `agentops:researcher` |
| Implementation plan / step sequencing | `Plan` |

Dispatch rules:

- Independent tasks → parallel (single message, multiple Agent calls)
- Dependent tasks → sequential
- Never dispatch `general-purpose` when a specialist exists
- For Astro+API+DB spanning a single wire phase (e.g. S3 = page + endpoint + migration): split into 3 parallel agents, one per concern. Don't dispatch `fullstack-developer` — the airio module boundary IS the API/UI split.

## 5. Module boundaries (codifying existing pattern)

Already in place — keep it:

```
src/
  pages/
    projects/[id]/<screen>.astro    ← SSR + form/click handlers; thin
    api/projects/[id]/<resource>.ts ← HTTP in, JSON out; thin
  lib/
    projects.ts                     ← shared project load + json helpers
    audit.ts                        ← writeAudit() + getSessionId()
    db.ts                           ← getDb() Drizzle adapter
    ids.ts                          ← newId() ksuid
  layouts/
    ProjectLayout.astro             ← chrome shared by all /projects/* screens
db/
  schema.ts                         ← Drizzle source of truth
migrations/
  NNNN_*.sql                        ← generated, hand-edit only for renames
```

Rules:

- **Endpoint files do HTTP I/O only.** Business logic that's reusable across two endpoints → extract to `src/lib/<module>.ts`. Pattern from `lib/audit.ts`.
- **One endpoint file per resource shape** (`sheets.ts`, `[sheet_id].ts`, etc.) — don't fold S3 PATCH into S2 sheets.ts when the route shape differs.
- **`src/lib/<module>.ts` has no Astro / Hono / Worker imports** at the top level except `cloudflare:workers` for env bindings. Pure functions + Drizzle queries.
- **Container interactions** (when Phase 7+ wires the Python side) go through one `src/lib/estimator.ts` adapter — never `env.ESTIMATOR.fetch()` inline in a page or API handler.

## 6. What NOT to do (drift guards)

Mirrors the wedge lock + drift memory. No exceptions:

- **Don't build a new Python analyzer** unless the Astro UI's data contract demands a NEW shape no existing analyzer produces. Extend an existing module in `estimator/` first. (CLAUDE.md §2: "A new Python module = guilty until proven innocent.")
- **Don't write a FastAPI HTML probe** (`app.py` / `app_ele.py` style) for a UI need. The probes were a pre-pivot pattern; the Astro UI is the product now.
- **Don't add vitest** without an explicit Carlos green-light. Default = smoke curl + dogfood. Vitest harness setup ≠ a wire slice.
- **Don't refactor adjacent code** during a wire phase. Surgical changes only. If you notice unrelated drift, mention it in chat or in the handoff, don't fix it in-flight.
- **Don't lift statichost's TDD-first or Hono-route-module patterns wholesale.** They fit statichost's customer-facing + paying-user constraints; airio is pre-customer + Astro file-routed. See §1.

## Why this rule exists

The Phase 0-5 backend wire shipped 7 commits end-to-end on `chore/repo-pivot-astro-cf` without a written workflow — every choice was re-derived from CLAUDE.md hard rules + the backend persistence plan + the wedge lock + the drift memory. Phase 6+ has more screens (S3 → S4 → S6 → S5 → S7) and more failure modes (first container call lands at S4). This rule freezes the patterns that worked in Phases 0-5 (migration discipline, audit trail as proof, agent dispatch, module boundaries) and **explicitly rejects** the patterns that would burn Claude-loop time on the wrong work (TDD-first UI, Hono modules, vitest harness setup). Read once at session start. Apply on every wire slice.
