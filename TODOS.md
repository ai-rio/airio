# TODOS — airio

Deferred items from code review and planning sessions. Ordered by priority.

---

## HIGH — Address before paid monitoring launch

### AUTH-001: Add auth ownership check to `setMonitoringEnabled` and `updateAlertConfig`
**What:** Both mutations in `convex/sites.ts` accept any `siteId` without verifying the caller owns that site.
**Why:** Any authenticated user can toggle monitoring or change alert thresholds for any site by knowing (or guessing) a siteId.
**Context:** `convex/promptBaskets.ts:20-22` shows the correct pattern: lookup site, check `site.userId !== userId`, throw. Three lines per mutation. This was deferred from `feat/monitoring-platform` because it was pre-existing debt and didn't block UI development, but must be fixed before paid launch.
**Where to start:** `convex/sites.ts:98` (setMonitoringEnabled) and `:77` (updateAlertConfig).
**Depends on:** nothing

### AUTH-002: Add ownership check to `visibilityReports.latestBySite` + `listBySite`
**What:** Both queries in `convex/visibilityReports.ts` accept `siteId` with no auth check — any authenticated user can read another user's PSOS history.
**Why:** Monitoring data is sensitive business intelligence. Leaking it between users would be a serious trust violation.
**Context:** Pattern: `const site = await anyDb(ctx).get(args.siteId); if (!site || site.userId !== userId) return null;` Add `auth.getUserIdentity()` call first.
**Where to start:** `convex/visibilityReports.ts:27` (latestBySite) and `:38` (listBySite).
**Depends on:** nothing

---

## MEDIUM — Quality improvements

### PERF-001: Batch query `visibilityReports.latestByUser`
**What:** Add a `visibilityReports.latestByUser` query that returns the latest report for ALL of a user's sites in a single query, keyed by siteId.
**Why:** The `/monitoring` page fires N `latestBySite` + N `listBySite(8)` subscriptions for N monitored sites (2N total). Acceptable at 1-5 sites; starts degrading at 10+.
**Context:** The audits module avoids this via `audits.listByUser` (one query, client-side grouping into a Map). Same pattern applies here. The existing `by_site_and_generated_at` index would need a `by_user` equivalent or the query joins through `sites.listByUser`.
**Where to start:** `convex/visibilityReports.ts` — add `latestByUser` using sites index.
**Depends on:** AUTH-002 (auth check needed on new query too)

### SCHEMA-001: `sites.userId` type inconsistency (`v.string()` vs `v.id('users')`)
**What:** `schema.ts:54` uses `userId: v.string()` for sites, while `schema.ts:34` (audits) uses `userId: v.id('users')`. The auth pattern `identity.subject.split('|')[0]` returns a string, so queries work — but this prevents referential integrity checks and future join queries.
**Why:** Minor now, painful later if you add cross-table user joins.
**Context:** Migration needed (widen-migrate-narrow). Low urgency; document before doing.
**Where to start:** Convex migration docs + `schema.ts:54`
**Depends on:** Convex migration tooling setup

### TEST-001: Set up test framework for Convex mutations
**What:** No automated test framework exists in the project. Critical auth mutations (`setMonitoringEnabled`, `updateAlertConfig`) have no tests catching their security gaps.
**Why:** The auth bugs in AUTH-001/AUTH-002 existed undetected because there are no tests. A minimal Convex test harness would catch ownership violations in CI.
**Context:** Convex provides a testing harness (`convex/testing`). A single test file verifying that mutations throw when `userId !== site.userId` would cover the most critical paths.
**Where to start:** `convex/__tests__/sites.test.ts`
**Depends on:** nothing (can be done independently)

---

## LOW — Future enhancements

### MONITORING-001: Server-side `monitoringEnabled` filter for `sites.listByUser`
**What:** Add a `sites.listMonitoredByUser` query using a compound index `by_user_and_monitoring_enabled`. Currently the client fetches all sites and filters client-side.
**Why:** Efficient at current scale (most users have <10 sites). Becomes wasteful if a user has 50+ sites with few monitored.
**Context:** Requires new index in schema + migration.
**Depends on:** SCHEMA-001 (if fixing userId type at the same time)

### MONITORING-002: Multi-engine support for prompt baskets
**What:** `promptBaskets.engine` is `v.union(v.literal('perplexity'))` — only one engine. To support ChatGPT, Gemini, etc., the union needs expanding.
**Why:** Product roadmap item — "multi-engine voting" mentioned in spec.
**Context:** Schema change + UI toggle + backend monitoring runner changes needed. Not trivial.
**Depends on:** Product decision on which engines to support
