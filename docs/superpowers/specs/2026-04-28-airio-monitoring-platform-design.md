# airio — Monitoring Platform Design

**Date:** 2026-04-28
**Status:** Approved
**Scope:** Transform airio from one-time audit tool into ongoing AEO monitoring platform with per-site subscriptions, score history, shareable reports, and alert notifications.

---

## Context

Airio is an AEO audit tool for the Brazilian market. Currently it provides one-time URL audits: crawl → LLM analysis → score + findings + CMS fix files. Auth (magic link), credit billing, and the audit pipeline are working. Billing (DodoPayments) is wired but untested. No monitoring, history, multi-site management, or sharing exists today.

This design adds the monitoring layer that transforms airio into a subscription SaaS with MRR.

---

## Goals

- Users can monitor N sites on a recurring schedule (weekly/monthly)
- Score history tracked across audits per site
- Alerts sent via email on score drops, new critical findings, or AI crawler blocks
- Agencies can share read-only audit reports with clients via public link
- Billing moves to per-site subscription (DodoPayments recurring) alongside existing one-off credits

---

## Architecture Decision

**Sites-first:** Introduce a `sites` table as the central monitoring entity. All audits link back to a site via `siteId`. Score history = all audits for a site, ordered by `_creationTime`. This is the correct foundation for per-site subscriptions, alert configs, and multi-site agency dashboards.

One-off audits (no `siteId`) remain unchanged — they serve as the top-of-funnel acquisition path.

---

## Data Model

### New: `sites` table

```typescript
sites: defineTable({
  userId: v.id("users"),
  url: v.string(),                       // canonical monitored URL
  name: v.string(),                      // display name, e.g. "Blog do Cliente"
  schedule: v.union(
    v.literal("weekly"),
    v.literal("monthly")
  ),
  monitoringEnabled: v.boolean(),        // false if subscription lapsed
  subscriptionId: v.optional(v.string()), // DodoPayments subscription ID
  nextAuditAt: v.number(),               // Unix timestamp of next scheduled run
  alertConfig: v.object({
    scoreDropThreshold: v.number(),      // default: 10 points
    criticalFindings: v.boolean(),       // default: true
    crawlerBlocked: v.boolean(),         // default: true
  }),
})
.index("by_user", ["userId"])
.index("by_next_audit", ["monitoringEnabled", "nextAuditAt"])
```

### New: `shareable_reports` table

```typescript
shareable_reports: defineTable({
  auditId: v.id("audits"),
  siteId: v.id("sites"),
  token: v.string(),                     // random slug for public URL
})
.index("by_token", ["token"])
.index("by_audit", ["auditId"])
```

### Modified: `audits` table

Add one optional field:
```typescript
siteId: v.optional(v.id("sites"))
```

Existing audits without `siteId` remain valid (one-off audits). Monitored audits always have `siteId` set.

---

## Monitoring Engine

A Convex cron job (`convex/crons.ts`) runs every hour:

```
1. Query sites WHERE monitoringEnabled = true AND nextAuditAt <= Date.now()
2. For each site: enqueue runAudit action with { url: site.url, siteId: site._id }
3. runAudit completes (existing pipeline, unchanged):
   - Stores audit with siteId populated
   - Updates site.nextAuditAt = now + (7 days | 30 days)
4. Post-audit alert check (new Convex action: checkAndSendAlerts):
   - Fetch previous audit for this site (second-most-recent by siteId)
   - Compare scores: if drop >= alertConfig.scoreDropThreshold → send alert
   - Compare findings: if new CRITICAL findings appeared → send alert
   - Compare robots: if AI crawlers newly blocked → send alert
   - All alerts sent via Resend (existing integration)
```

Monitored sites consume 0 credits — subscription covers all automated audits.
Manual one-off audits still consume credits as before.

---

## Dashboard Routes

### `/` — Home (redesigned)

- **Subscribed users:** Sites list as primary view. Each site card shows: name, URL, current score, trend arrow (↑↓), next audit countdown, "View" link.
- **Non-subscribed users:** Existing one-off audit form (unchanged). "Start monitoring" CTA after audit completes.
- "Add Site" button → subscription checkout.

### `/sites/[siteId]` — Site Detail (new)

- Score history chart: line chart, last 12 audits, x-axis = date, y-axis = score (0–100)
- Current score breakdown: algorithmicBase + LLM adjustment (same as existing `/audit/[id]`)
- Latest findings: critical/high/medium/low severity cards
- CMS fix files: download buttons (same as existing)
- Rewritten passages
- Alert config toggles (score threshold, critical findings, crawler blocks)
- "Share Report" button → calls `createShareableReport` mutation → opens `/report/[token]`

### `/report/[token]` — Public Shareable Report (new)

- No auth required
- Reads audit via `shareable_reports.token` lookup
- Displays: site name, URL, score, findings, CMS instructions
- Footer: "Powered by airio — ai.rio.br"
- Print-to-PDF via browser (no server-side rendering needed)

### `/audit/[id]` — One-off Audit Results (unchanged)

Existing route remains. One-off audits still accessible here.

---

## Alert Emails

Triggered by `checkAndSendAlerts` action after every auto-audit. Uses existing Resend integration.

| Condition | Subject | Body summary |
|-----------|---------|--------------|
| Score drop ≥ threshold | `⚠ Score caiu de {prev} para {new} em {site}` | Score comparison, top new issues, link to site detail |
| New CRITICAL finding | `🚨 Novo problema crítico detectado em {site}` | Finding description, recommended fix, link to site detail |
| AI crawler newly blocked | `🤖 {Bot} bloqueado em {site} — ação necessária` | Which bot, robots.txt context, link to CMS fix instructions |

All emails in PT-BR. Plain HTML template, link back to `/sites/[siteId]`.

---

## Billing

### Plans (monthly, via DodoPayments recurring subscriptions)

| Plan | Sites | Schedule | History | Reports |
|------|-------|----------|---------|---------|
| Solo | 1 | Weekly | 90 days | No |
| Agency | 20 | Weekly | Unlimited | Yes (shareable links) |

### Subscription flow

1. User clicks "Add Site" → DodoPayments subscription checkout (plan tier)
2. Webhook `subscription.activated` → `sites.monitoringEnabled = true`
3. Webhook `subscription.cancelled` → `sites.monitoringEnabled = false` (history retained)
4. Webhook `subscription.past_due` → same as cancelled

### One-off credits

Remain unchanged. Non-monitored audits consume credits. Credit packs (10/30/100) still purchaseable. Monitoring subscription is orthogonal to credits.

---

## Out of Scope (this phase)

- Competitor comparison
- White-label / custom branding for agencies
- WordPress plugin
- Daily schedule (only weekly/monthly for now)
- PDF server-side generation (browser print-to-PDF is sufficient)
- Client portal logins (shareable link is sufficient for agency reporting)

---

## Implementation Phases

### Phase 1 — Foundation (unblocks monitoring)
- Fix `userId: ''` bug in dev bypass (`_page-client.tsx:19`)
- Add `sites` and `shareable_reports` tables to Convex schema
- Add `siteId` optional field to `audits` table
- Migration: no existing data to migrate (siteId is optional)

### Phase 2 — Monitoring engine
- Convex cron job: query due sites, enqueue audits
- Extend `runAudit` to accept and store `siteId`
- `checkAndSendAlerts` action: compare audits, send Resend emails

### Phase 3 — Dashboard redesign
- `/sites/[siteId]` route with score history chart
- Home page: sites list view for subscribed users
- "Add Site" flow

### Phase 4 — Shareable reports
- `createShareableReport` mutation
- `/report/[token]` public route

### Phase 5 — Billing
- DodoPayments subscription products setup
- Webhook handlers: activated / cancelled / past_due
- Plan enforcement: site limit per plan

### Phase 6 — Production model upgrade
- Replace free Ling model with production model (fixes `schemaBlocks`/`cmsInstructions` truncation)
- Set `OPENROUTER_MODEL` in Convex env for production deployment
