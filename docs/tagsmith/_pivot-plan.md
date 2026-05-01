# airio → Tagsmith Pivot Plan

## Decisions locked

| # | Decision |
|---|----------|
| Repo strategy | In-place rename `/home/carlos/apps/airio/` → `/home/carlos/apps/tagsmith/` |
| Convex deployment | Fresh deployment (clean schema, no migration baggage) |
| Test data | Wipe (Carlos is sole test user) |
| Domain | Open via env var `TAGSMITH_BASE_URL` and `NEXT_PUBLIC_DASHBOARD_URL` (no hardcoded `ai.rio.br` anywhere in code) |
| Locales | EN primary; PT-BR + ES at launch |

## Reuse manifest

### From airio — KEEP (refactor + extend)

| Path | Purpose | Action for Tagsmith |
|------|---------|---------------------|
| `convex/auth.ts`, `convex/auth.config.ts` | Auth (Convex Auth) | Keep as-is |
| `convex/users.ts` | User table + helpers | Keep, drop AEO-specific fields if any |
| `convex/billing.ts` | Stripe/Dodo integration | Keep, swap product/price IDs to Pro $19, Agency $49, LTD $99 |
| `convex/sites.ts` | Sites CRUD + monitoring | Keep — multi-site monitor is Pro/Agency feature |
| `convex/audits.ts` | Audit pipeline | **Refactor** — became schema-generation pipeline |
| `convex/visibilityReports.ts` + `convex/visibilitySnapshots.ts` + `convex/promptBaskets.ts` | AEO citation tracker | **Promote to Tool 3** "AEO Citation Tracker" — rename UI, keep DB |
| `convex/shareableReports.ts` | Public share pages | Keep — useful for free-tier output sharing |
| `convex/usageLogs.ts` | Per-user usage tracking | Keep — drives free-tier limits |
| `convex/crons.ts`, `convex/http.ts` | Scheduled tasks + webhooks | Keep |
| `dashboard/app/sign-in/`, `settings/`, `billing/` | Auth + settings UI | Keep |
| `dashboard/app/sites/`, `monitoring/` | Site + monitor UI | Keep, refit copy |
| `dashboard/app/audit/`, `audits/`, `report/` | Schema generation UI | **Refactor** to schema-tool UX |
| `site/app/page.tsx` | Marketing LP | **Rewrite** EN-first Tagsmith copy |
| `site/app/blog/` | Blog | Keep, replace content |
| `site/app/docs/` | Docs | Keep, replace content |
| `vitest.config.ts`, `biome.json`, `tsconfig.json` | Tooling | Keep |
| Auth bug fix backlog (TODOS.md AUTH-001, AUTH-002) | Pre-launch debt | **Fix in week 1** before any new feature work |

### From airio — DROP (AEO-specific copy/branding/PT-only assets)

| Path | Reason |
|------|--------|
| Hardcoded `R$` BRL pricing in `site/app/page.tsx` | Replace with `$` USD via env-config |
| `'Primeira ferramenta de AEO do Brasil'` hero string | Reposition global EN-first |
| Hardcoded domain `ai.rio.br` / `seo.ai.rio.br` | Replace with `process.env.TAGSMITH_BASE_URL` etc |
| `llms.txt` + `robots.txt patch` features | Move to "v2 audit tool" backlog (not v1 scope) |
| `Trechos reescritos` (AI rewrite) feature | Defer to v2 |
| BRL credit-bundle pricing | Replace with subscription Pro/Agency + LTD |

### From getmd-design — BORROW (port pattern, not file copy)

| Asset | Use in Tagsmith |
|-------|-----------------|
| `convex/apiKeys.ts` | Agency tier API key auth — port directly |
| `convex/extractions.ts` (Browserless integration) | URL fetching pipeline — port for Schema + OG URL fetch |
| `wordpress-plugin/` | v2 channel (month 4-6) — clone scaffold when ready |
| `extension/` (VS Code) | v2 channel (month 4-6) — clone scaffold when ready |
| `figma-plugin/` | Defer — wrong fit for Tagsmith |
| `ecosystem.config.js`, `deploy.sh` | Port for tagsmith deploy |
| Dodo Payments integration | Already in airio billing.ts — keep, swap product IDs |
| `site/app/for-cursor/`, `samples/`, `wordpress/` | Lead-magnet page pattern — clone shape, replace content |

## Migration sequence (week 1)

| Day | Action | Verification |
|-----|--------|--------------|
| 1 | Fix airio TODOS auth bugs AUTH-001 + AUTH-002 (3 lines × 4 mutations) | Tests pass |
| 1 | `git mv apps/airio apps/tagsmith` (in-place rename) | Branch clean |
| 1 | Create fresh Convex deployment, push schema | `npx convex dev` connects |
| 2 | Replace all hardcoded `ai.rio.br` / `seo.ai.rio.br` / `airio` strings → `process.env.TAGSMITH_BASE_URL` + `process.env.NEXT_PUBLIC_DASHBOARD_URL` + brand const | grep returns 0 hardcoded refs |
| 2 | Replace BRL pricing constants with USD ($19/49/99 LTD) tied to env Stripe/Dodo product IDs | Pricing page renders new tiers |
| 3 | Refactor `convex/audits.ts` to schema generator: **static-first pipeline** (cheerio parses existing JSON-LD/microdata/RDFa/OG/semantic HTML) + Haiku fallback for ambiguous entities, 10 schema types | Single URL paste returns valid JSON-LD for all applicable types; static-hit rate measurable in logs |
| 3 | Scaffold `apps/tagsmith/cli/` package — `npx tagsmith` runs static-first extraction only, no API key, MIT license. Reuses same parser module as Convex action. | `npx tagsmith --url https://example.com` outputs JSON-LD locally |
| 4 | Build Tool 2: OG generator action (Browserless URL fetch + `@vercel/og` render at 1200×630, 3 templates) | Free user gets watermarked PNG |
| 5 | Reposition `visibilityReports` + `promptBaskets` UI as "Citation Tracker" tool 3 | Existing audit logic surfaces under new name |
| 5 | i18n bootstrap: `next-intl` setup, EN primary, scaffold PT-BR + ES JSON files | Locale switcher works |
| 6 | Fix any cascading test failures + lint clean | `vitest run` + `biome check` green |
| 7 | Wipe Convex tables (test data) + manual smoke test all 3 tools end-to-end | Full happy paths green |

Net: **week 1 ships the rebrand + 3-tool foundation**. Weeks 2-4 are landing pages, content, and launch prep per `_distribution-plan.md`.

## Scope expansion: 2 tools → 3 tools

Original PRD: Schema + OG.

Pivot enables: **Schema + OG + AEO Citation Tracker** at launch with negligible incremental work because tracker code already exists in airio.

| Tool | v1 status | Source |
|------|-----------|--------|
| Schema Markup Generator | New build, but reuses audit pipeline | airio refactor |
| OG Image Generator | New build | Borrows getmd Browserless pattern + `@vercel/og` |
| AEO Citation Tracker | Already built in airio (PSOS) | Rename + reposition only |

3-tool toolkit at $19 Pro / $49 Agency closes the perceived-value gap vs OpenGraph.xyz's 6-tool $29 bundle.

## Out-of-scope (still v1)

- WordPress plugin (port from getmd in month 4-6, distribution v2)
- VS Code extension (port from getmd in month 4-6)
- Figma plugin (skip, wrong fit)
- llms.txt / robots.txt audit (defer to v2 audit tool)
- AI excerpt rewriter (defer)
- BRL pricing (USD only v1, Stripe handles VAT)

## Model strategy (build-time)

Mixed models per task. Right tool per surface — don't lock one model across 14 days.

| Surface | Model | Why |
|---------|-------|-----|
| airio→tagsmith pivot, Convex schema/auth/billing refactor, parser correctness, env scrubbing (Days 1-3) | **Opus 4.7** | Cross-file reasoning, Convex idioms, locale-aware config, parser bugs = user-facing breakage |
| Design tokens wiring, component primitives, marketing pages, dashboard refit (Days 4-6) | **Sonnet 4.6** | Mechanical work with consistency requirements; cheaper than Opus, smarter than Haiku |
| Locale string drafts (EN→PT-BR/ES first pass) | **Sonnet 4.6** | Tone judgment matters; needs human review pass before ship |
| Runtime LLM calls inside Tagsmith (schema fallback, citation checks) | **Haiku 4.5** | Bounded JSON output, latency + cost critical at scale, fallback path exists |
| Code review per PR, test writing | **Sonnet 4.6** | Better than Haiku at catching subtle bugs, cheaper than Opus for diff review |

**Budget**: $50-150 for Opus across week 1 buys 14-day-ship correctness. Penny-wise/pound-foolish to scaffold with Haiku.

**Anti-pattern**: Don't use Haiku for "save cost" on scaffolding. Subtle Convex query/mutation/action confusions silently break the app and cost a week of debugging.

## Brand migration risk

- `ai.rio.br` SEO equity: minimal (no public users, no organic traffic established) — clean break is safe
- 301 redirect from `ai.rio.br` → new Tagsmith domain post-launch (keep cert + 1-line nginx rule)
- All test users wiped — no migration emails needed
