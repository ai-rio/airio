<!-- /autoplan restore point: /home/carlos/.gstack/projects/airio/feat-monitoring-platform-autoplan-restore-20260429-074759.md -->
# Monitoring Platform — Implementation Plan
Branch: feat/monitoring-platform  
Status: In Progress

## Goal
Complete the monitoring product UI: two new pages (`/monitoring`, `/sites/[siteId]/monitoring`), nav update, dashboard PSOS integration, and UX enhancements. Backend is fully ready (Convex schema + mutations).

## Context
- Spec: `docs/dashboard/dash-architecture.md` (page map, data queries)
- UX: `docs/dashboard/dash-ui-ux-specs.md` (empty states, PSOS badge, skeleton loaders, animated numbers, glossary tooltips)
- Design rules: `.claude/rules/design-system.md` (zero radius, Bebas Neue, no hardcoded colors)
- Wireframe reference: `~/.gstack/projects/airio/designs/dashboard-20260428/finalized.html`

## What Already Exists
| Asset | File | Notes |
|---|---|---|
| Convex schema | `convex/schema.ts` | `monitoringEnabled`, `alertConfig.psosDropThreshold`, `promptBaskets`, `visibilityReports` |
| Mutations | `convex/sites.ts` | `setMonitoringEnabled`, `updateAlertConfig` |
| Query data | `convex/visibilityReports.ts`, `convex/promptBaskets.ts` | ready |
| PsosGauge | `dashboard/components/psos-gauge.tsx` | needs design token fix |
| PsosSparkline | `dashboard/components/psos-sparkline.tsx` | needs design token fix |
| Site detail | `dashboard/app/sites/[siteId]/page.tsx` | 494 lines, full audit tab |
| Prompts page | `dashboard/app/sites/[siteId]/prompts/page.tsx` | 191 lines |
| DashboardNav | `dashboard/components/dashboard-nav.tsx` | only Dashboard + Faturamento |

## What's Missing
| # | Item | Route / File | Priority |
|---|---|---|---|
| 1 | Monitoramento nav link | `dashboard-nav.tsx` | P0 |
| 2 | `/monitoring` page | `app/monitoring/page.tsx` | P0 |
| 3 | `/sites/[siteId]/monitoring` page | `app/sites/[siteId]/monitoring/page.tsx` | P0 |
| 4 | PSOS mini indicator on dashboard site cards | `app/_page-client.tsx` | P1 |
| 5 | Fix PsosGauge/PsosSparkline design tokens | `components/psos-gauge.tsx`, `components/psos-sparkline.tsx` | P1 |
| 6 | `<PsosChangeBadge>` component | new component | P1 |
| 7 | `<EmptyStateDashboard>` + `<EmptyStateMonitoring>` | new components | P2 |
| 8 | `<DiagnosticCTA>` component | new component | P2 |
| 9 | Skeleton loaders (`<SiteCardSkeleton>`, `<MonitoringCardSkeleton>`) | new components | P2 |
| 10 | `useCountUp` hook + `<AnimatedNumber>` | new hook/component | P2 |
| 11 | Glossary tooltips (`<InfoTooltip>`) + constants | new component | P3 |
| 12 | Mobile responsive tweaks | global | P3 |

---

## Phase 0 — Backend Prerequisites (P0, before any UI work)

### 0A. Fix `setMonitoringEnabled` — add ownership check
**File:** `convex/sites.ts:98`  
**Change:** After `auth.getUserIdentity()`, lookup site, verify `site.userId === userId`, throw if not owner. Same pattern as `promptBaskets.ts:20-22`.

### 0B. Fix `updateAlertConfig` — add ownership check + psosDropThreshold field
**File:** `convex/sites.ts:77`  
Two bugs: (a) no auth ownership check — add same pattern as 0A. (b) `psosDropThreshold` missing from args — add `psosDropThreshold: v.optional(v.number())` to the args schema.  
**Note on full-replace semantics:** `patch(siteId, { alertConfig: ... })` replaces the entire alertConfig object. The UI must always send all 4 fields (`scoreDropThreshold`, `criticalFindings`, `crawlerBlocked`, `psosDropThreshold`) — read current `site.alertConfig` and merge before calling mutation.

### 0C. Fix `visibilityReports.latestBySite` + `listBySite` — add ownership check
**File:** `convex/visibilityReports.ts:27,38`  
Add: lookup site by siteId, verify caller owns it. Pattern: `const site = await anyDb(ctx).get(args.siteId); if (!site || site.userId !== userId) return null;`

---

## Phase 1 — Core Routes (P0)

### 1A. DashboardNav: add "Monitoramento" link
**File:** `dashboard/components/dashboard-nav.tsx`  
**Change:** Extend navLinks type to `{ label: string; href: string; isActive?: (pathname: string) => boolean }`. Add:
```ts
{ label: 'Monitoramento', href: '/monitoring', isActive: (p) => p.startsWith('/monitoring') || (p.startsWith('/sites/') && p.endsWith('/monitoring')) }
```
Update the active check in the map: `const isActive = link.isActive ? link.isActive(pathname) : (link.href === '/' ? pathname === '/' : pathname.startsWith(link.href))`.

### 1B. `/monitoring` — AI Visibility Command Centre
**File:** `dashboard/app/monitoring/page.tsx`  
**Layout:**
- **Status strip** (FIRST element — serves user not developer): `N sites monitorados · Última coleta: {date} · {K} alertas ativos` — `font-[family-name:var(--font-mono)] text-[11px] px-8 py-3 border-b border-border bg-muted/30`
- Header: "VISIBILIDADE EM IA" (`font-[family-name:var(--font-bebas)] text-[64px]`) + subtitle (`font-sans text-muted-foreground text-[14px]`) — `px-8 py-8 border-b border-border`
- Grid of monitored site cards (filter: `monitoringEnabled: true`) — `grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px border border-border`
- Empty state when no monitored sites

**Card visual hierarchy** (primary → secondary → tertiary → quaternary):
1. PSOS % — `font-[family-name:var(--font-bebas)] text-[48px] leading-none` — color: ≥60% `text-[var(--brand-text)]`, ≥30% `text-[var(--brand-warning)]`, <30% `text-[var(--brand-danger)]`
2. Site name — `font-sans text-foreground text-[14px] font-medium`
3. Sparkline (8 weeks) — `stroke="var(--brand-text)" fill="var(--surface-yellow)"` no dots, no animation
4. CI text — `font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground`
5. Sample count — `font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground`
6. Status dot — 8px circle: monitoring active + fresh → `bg-[var(--brand-success)]`; stale (>10 days) → `bg-[var(--brand-warning)]`; PSOS alert → `bg-[var(--brand-danger)]`; monitoring off → `bg-muted`
7. "GERENCIAR PROMPTS →" — `font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em]` at card bottom

**Partial states (all must be handled):**
- `latestReport === undefined` → `<MonitoringCardSkeleton>`
- `latestReport === null` + monitoring on + basket exists → "Aguardando primeira coleta" placeholder in gauge area with expected scan date
- `latestReport` exists but `generatedAt` > 10 days ago → stale warning badge `text-[var(--brand-warning)] font-[family-name:var(--font-mono)] text-[11px]` — "Última coleta: X dias atrás"
- Query error → replace section with inline `text-[var(--brand-danger)]` + "Tentar novamente" link
- No monitored sites → `<EmptyStateMonitoring>`

**Convex queries:**
- `api.sites.listByUser` (filter `monitoringEnabled` client-side — **N+1 note**: 2N subscriptions for N sites; acceptable for typical users with 1-5 sites; batch query deferred to TODOS)
- `api.visibilityReports.latestBySite` per site
- `api.visibilityReports.listBySite` (limit 8) per site (sparkline)
- **Stale check constant:** `STALE_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000` — define in `dashboard/lib/monitoring-constants.ts`

### 1C. `/sites/[siteId]/monitoring` — Visibilidade Tab
**File:** `dashboard/app/sites/[siteId]/monitoring/page.tsx`

**Section layout** (4 sections, each `px-8 py-8 border-b border-border`, last omits border-b):

**Section 1 — Header** (`grid grid-cols-[1fr_auto] gap-8 items-end`):
- Left: back link + "Visibilidade em IA" (Bebas 64px) + "Monitoramento semanal · motor: Perplexity" (mono 11px muted)
- Right: **Enable/disable monitoring toggle** (most consequential control — must be in header, not buried)
  - Toggle pattern: `w-11 h-6 border border-border bg-[var(--brand)]/bg-muted` with on/off label
  - `aria-label="Ativar/desativar monitoramento"` `role="switch"` `aria-checked={enabled}`

**Section 2 — PSOS**:
- `PsosGauge` hero: PSOS % at `text-[96px]` Bebas + CI text (mono 11px muted) + sample count (mono 11px)
- `PsosSparkline` below gauge (8 weeks)
- Footnote: "Últimas 8 semanas · atual X%"
- `PsosChangeBadge` inline with score
- Partial states: `latestReport === null` + monitoring on → "Aguardando primeira coleta · primeira coleta em {nextGeoCheckAt}" placeholder; query error → `text-[var(--brand-danger)]` + retry; stale > 10d → warning

**Section 3 — Prompt basket summary** (read-only):
- If no basket: "Nenhum prompt configurado. Configure para medir a visibilidade." + "Configurar →" button
- If basket: brand name (body), prompts list (mono 11px, max 3 visible + "ver mais"), engine label, "GERENCIAR PROMPTS →" link
- If basket but zero reports: "Aguardando primeira coleta" state

**Section 4 — Alert config + DiagnosticCTA**:
- `psosDropThreshold` toggle + `<input type="number" min="0" max="1" step="0.05">` validated before mutation
- `DiagnosticCTA` trigger: show when `latestReport.psos < previousReport.psos - psosDropThreshold` AND no `audit.status === 'completed'` with `createdAt > previousReport.createdAt` for this site
- DiagnosticCTA zero credits path: if `userCredits === 0` → show "Comprar créditos →" to `/billing`, not "Rodar auditoria"

**Accessibility checklist** (applies to all new pages):
- Toggles: `role="switch"` `aria-checked={on}` + visible focus `focus:ring-2 focus:ring-[var(--brand)]`
- PSOS gauge: `aria-label="PSOS: X%"`
- All icon-only buttons: `aria-label`
- All interactive elements: min 44px height touch target
- Toasts: `role="alert"` `aria-live="polite"`

**Convex queries:**
- `api.visibilityReports.latestBySite`
- `api.visibilityReports.listBySite` (limit 8)
- `api.promptBaskets.listBySite`
- `api.sites.getById`
- `api.audits.listBySite` (needed for DiagnosticCTA trigger: check if completed audit exists after previousReport.generatedAt)

**Convex mutations:**
- `api.sites.setMonitoringEnabled`
- `api.sites.updateAlertConfig` (only `psosDropThreshold`)

---

## Phase 2 — Dashboard PSOS + Design Tokens (P1)

### 2A. Fix PsosGauge + PsosSparkline design tokens
**Files:** `components/psos-gauge.tsx`, `components/psos-sparkline.tsx`  
**Change:** Replace hardcoded colors (`text-green-600`, `text-yellow-600`, `text-red-600`, `text-gray-500`, `font-bold`) with design tokens:
- ≥60% → `text-[var(--brand-success)]`
- ≥30% → `text-[var(--brand-warning)]`  
- <30% → `text-[var(--brand-danger)]`
- Labels → `text-muted-foreground font-[family-name:var(--font-mono)] text-[11px]`

### 2B. `<PsosChangeBadge>` component
**File:** `dashboard/components/psos-change-badge.tsx`  
**Props:** `currentPsos: number`, `previousPsos: number | null`  
**Behavior:** delta = current - previous; up → `bg-[var(--brand-success-muted)] text-[var(--brand-success)] border border-[var(--brand-success-border)]` "↑ +Xpp"; down → `bg-[var(--brand-danger-muted)] text-[var(--brand-danger)] border border-[var(--brand-danger-border)]` "↓ –Xpp"; |delta| < 0.01 → null. Font: `font-[family-name:var(--font-mono)] text-[10px] px-1.5 py-0.5 uppercase`.

### 2C. Dashboard site cards: mini PSOS indicator
**File:** `dashboard/app/_page-client.tsx` (SiteCard component)  
**Change:** Add PSOS dot + `<PsosChangeBadge>` inline when monitoring enabled. Query `latestBySite` + prev for each site.  
No monitoring → show "—".

---

## Phase 3 — UX Enhancements (P2)

### 3A. Empty states
- `<EmptyStateDashboard>` — two CTA cards (Auditoria AEO + Monitoramento) when `sites.length === 0`
- `<EmptyStateMonitoring>` — full-page layout with headline + FAQ accordion when no monitored sites

### 3B. `<DiagnosticCTA>`
Alert box (border-left danger) shown when PSOS dropped > threshold and no recent audit. Button: "Rodar auditoria agora →".

### 3C. Skeleton loaders
- `<SiteCardSkeleton>` — animate-pulse rectangles for name/URL/score/sparkline
- `<MonitoringCardSkeleton>` — for monitoring cards
- Use in all pages while `useQuery` returns `undefined`

### 3D. `useCountUp` hook + `<AnimatedNumber>`
**File:** `dashboard/lib/use-count-up.ts`  
Animate 0→target using `requestAnimationFrame`. Duration 600ms. Trigger on mount + value change.  
**Progressive enhancement note:** Phase 1 gauges use plain `Math.round(psos * 100)` display. Phase 3D wraps these in `<AnimatedNumber>` — no Phase 1 import dependency on this hook.

---

## Phase 4 — Polish (P3)

### 4A. `<InfoTooltip>` + glossary constants
**File:** `dashboard/components/info-tooltip.tsx`, `dashboard/lib/glossary.ts`  
Terms: PSOS, IC 95%, Amostras detectadas.  
Use shadcn `Tooltip` or `title` attribute.

### 4B. Mobile responsive tweaks
- Dashboard: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` (already done?)
- Monitoring: same grid
- Site detail: clamp large score number, no horizontal scroll on findings

---

## Verification Steps
1. `cd dashboard && bun run type-check` — zero errors
2. `bunx biome check .` — zero errors/warnings in changed files
3. `/monitoring` page loads, shows monitored sites or empty state
4. `/sites/[siteId]/monitoring` loads, PSOS gauge renders, toggle works
5. DashboardNav shows 3 links, "Monitoramento" active on `/monitoring`
6. Dashboard site cards show PSOS dot if monitoring enabled

---

## Phase 5 — Dashboard Layout Restructure (sidebar + proper app shell)

**Context:** Dashboard currently renders an LP-style hero ("SUA PRESENÇA NO CHATGPT" at 120px Bebas) as the primary empty-state UI. Reference redesign: shadcn-admin pattern (left sidebar + sticky header + stats cards + content). Shadcn components already installed: `sidebar`, `sheet`, `tooltip`, `skeleton`, `avatar`, `use-mobile`.

### 5A. Root layout — TooltipProvider
**File:** `dashboard/app/layout.tsx`
Wrap children with `<TooltipProvider>` (required by shadcn tooltips used in nav dropdown). No SidebarProvider needed — we're keeping top-nav.

### 5B. DashboardNav restructure (not replacement)
**File:** `dashboard/components/dashboard-nav.tsx`
**Keep top navbar.** Restructure nav items and add avatar dropdown.

**Primary nav links (left):**
- Dashboard → `/`
- Auditar Site → `/audit/new`
- Monitoramento → `/monitoring`
- Histórico → `/audits` (audit history — cross-site list; see 5H)

**Remove from primary nav:** Faturamento (moves to avatar dropdown).

**Right side:** Avatar dropdown (see 5C). Replace current static avatar/logout with proper dropdown.

### 5C. Avatar dropdown in DashboardNav
**Within** `dashboard/components/dashboard-nav.tsx` (or extracted to `nav-user.tsx` if file grows).
Uses existing `<DropdownMenu>` (already installed). Query `api.users.getMe` (already exists).

**Avatar:** `<Avatar>` with user initials fallback (first letter of email). Loading: `<Skeleton className="w-8 h-8" />`.

**Dropdown items:**
- User email (non-clickable, muted label at top)
- separator
- Faturamento → `/billing` (icon: CreditCard)
- separator
- Sair → `useAuthActions().signOut()` (icon: LogOut)

**Design tokens:** `<DropdownMenu>` inherits zero radius globally. Avatar: `w-8 h-8 border border-border`.

### 5D. Main dashboard page — conditional hero/app layout
**File:** `dashboard/app/_page-client.tsx`

**Conditional on `sites.length`:**

**Zero sites state** (`sites.length === 0`): Keep existing hero section. Clean it up:
- Keep "SEUS SITES. SUA PRESENÇA NO CHATGPT." headline + brand copy
- Keep ticker strip (it belongs on the dashboard as brand signal for new users)
- Keep "ADICIONAR SITE →" CTA
- Keep "AUDITAR SITE →" secondary CTA
- Remove: the `EmptyStateDashboard` section with "SITES MONITORADOS" header below hero (redundant; the hero IS the empty state)

**1+ sites state** (`sites.length > 0`): Replace hero with:

**Compact page header:**
```
px-8 py-4 border-b border-border flex items-center justify-between
Left: "DASHBOARD" (font-bebas text-[28px] leading-none)
Right: "+ ADICIONAR SITE →" (primary button, h-9 px-6)
```

**Stats row** (4 cells, `grid grid-cols-2 lg:grid-cols-4 border-b border-border`):
```
| SITES | MÉDIA AEO | MÉDIA PSOS | ALERTAS |
| 3     | 72        | 45%        | 2       |
```
Each cell: `px-8 py-5 border-r border-border last:border-r-0`.
Label: `font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1`.
Value: `font-[family-name:var(--font-bebas)] text-[40px] leading-none`.
At 0 sites (impossible in this branch): all show `—`.

**Data sources for stats:**
- Sites count: `sites.length`
- Média AEO: avg of `latestAudit.score` per site (requires 5G)
- Média PSOS: avg of `latestReport.psos` per site (`api.visibilityReports.latestBySite`)
- Alertas ativos: count of sites where `previousReport.psos - latestReport.psos > threshold`

**Site rows** (replaces SiteCard grid):
```
border border-border (table wrapper)
Each row: grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 px-8 py-4 border-b border-border hover:bg-muted/50
```
Columns:
1. Site name (font-sans font-medium) + URL (font-mono text-[11px] text-muted-foreground)
2. AEO: Bebas 32px score + `<PsosChangeBadge>` (reuse existing pattern)
3. PSOS: Bebas 32px % + `<PsosSparkline>` (64px wide) — `—` if monitoring disabled
4. Alert count badge (if > 0: `bg-[var(--brand-danger)] text-white font-mono text-[10px] px-1.5`)
5. "GERENCIAR →" link (mono 11px brand-text)

### 5E. Add `audits.latestBySite` Convex query (prerequisite for 5D stats)
**File:** `convex/audits.ts` (add new query)
Required for "Média AEO" stat. Check if `by_siteId` index exists first.
```ts
export const latestBySite = queryGeneric({
  args: { siteId: v.id('sites') },
  handler: async (ctx, { siteId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject.split('|')[0];
    const site = await anyDb(ctx).get(siteId);
    if (!site || site.userId !== userId) return null;
    return await anyDb(ctx).query('audits')
      .withIndex('by_site', q => q.eq('siteId', siteId))
      .order('desc').first();
  },
});
```

### 5H. Audit history page (new route, low scope)
**File:** `dashboard/app/audits/page.tsx` (new)
Cross-site audit list. Simple table: site name | date | AEO score | status | "Ver →" link.
Data: `api.audits.listByUser` — check if this query exists; if not, add alongside 5E.
Nav link added in 5B: "Histórico → /audits".

### Implementation order (safe sequence)
1. **5E** — add `audits.latestBySite` (+ `listByUser` if needed for 5H) to Convex
2. **5A** — layout.tsx: TooltipProvider wrap
3. **5B + 5C** — DashboardNav restructure + avatar dropdown (self-contained; no layout change)
4. **5D** — dashboard conditional hero/stats/rows (depends on 5E)
5. **5H** — audit history page (independent, can ship after 5B)

---

## NOT in Scope (this branch)
- Upgrade/paywall gating UI (canEnableMonitoring check) — defer (no subscription product)
- Multi-engine monitoring toggle — defer (basket engine field needs schema expansion)
- Monitoring subscription plan cards in billing
- Batch query `visibilityReports.latestByUser` — defer (2N subscriptions acceptable for <10 sites; see TODOS)
- Server-side `monitoringEnabled` filter on `sites.listByUser` — defer (client-side filter acceptable at current scale)
- ~~`useCountUp`/`AnimatedNumber` (Phase 3D) — USER CHALLENGE~~ → **KEPT: user decided polish supports conversion**
- ~~`<InfoTooltip>`/glossary constants (Phase 4A) — USER CHALLENGE~~ → **KEPT**
- ~~Mobile responsive tweaks (Phase 4B) — USER CHALLENGE~~ → **KEPT**
- `/settings` route (exists as empty dir)
- E2E tests — TODOS.md: add before paid monitoring launch
- `latestBySiteList(siteIds[])` batch query — TODOS.md: add when user site count grows

## Added to Scope (from CEO review)
- **`updateAlertConfig` backend fix** — add `psosDropThreshold` to mutation args (`convex/sites.ts:77`)
- **Sample size warning** — in `PsosGauge`: when `totalSamples < 10`, show "Dados insuficientes para conclusões confiáveis"
- **Error states** — generic error boundary per new page + toast for `setMonitoringEnabled`/`updateAlertConfig` failures
- **psosDropThreshold input validation** — validate 0–1 range before mutation call
- **"Monitoring enabled but no basket" state** — in `/sites/[siteId]/monitoring` prompt summary section
- **Observability** — log monitoring enable/disable events + alert config saves (per `.claude/rules/observability.md`)

## Decision Audit Trail
| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|---|---|---|---|---|---|
| 1 | CEO | P0 = routes + nav before UX polish | Mechanical | P3 pragmatic | Core navigation must work before enhancement layers | — |
| 2 | CEO | Reuse PsosGauge/Sparkline, fix tokens | Mechanical | P4 DRY | Components exist, just need token correction | — |
| 3 | CEO | Skip paywall gating | Mechanical | P3 pragmatic | Subscription product not built — nothing to gate against | — |
| 4 | CEO | Approach B (full plan) | Mechanical | P1+P2 | Completeness cheap with CC; DiagnosticCTA drives revenue | Approach A (nav only) |
| 5 | CEO | SELECTIVE EXPANSION mode | Mechanical | P6 | Feature enhancement on existing system | EXPANSION |
| 6 | CEO | Auth ownership gap → TODOS.md | Mechanical | P3 pragmatic | Existing debt, not introduced here; doesn't block UI work | Fix in this PR |
| 7 | CEO | Add psosDropThreshold to updateAlertConfig | Mechanical | P5 | Trivial backend fix, plan can't work without it | — |
| 8 | CEO | Add sample size warning to PsosGauge | Mechanical | P1 | Prevents misleading metric display with small n | — |
| 9 | CEO | Add error states + mutation error toasts | Mechanical | P1 | Error paths incomplete without feedback | — |
| 10 | CEO | Add psosDropThreshold input validation | Mechanical | P5 | User input → mutation, needs range check | — |
| 11 | CEO | Phase 3D+4 → USER CHALLENGE at final gate | Taste | P1 vs P3 | Both models agree premature; user has product context | — |
| 12 | CEO | Multi-engine schema → TODOS.md | Mechanical | P3 pragmatic | basket engine field needs v.union expansion; out of UI scope | — |
| 13 | Design | Status strip as first element on /monitoring | Mechanical | P5 | Users need system status immediately, not a title | — |
| 14 | Design | Enable/disable toggle moved to header (Section 1) | Mechanical | P5 | Most consequential control must be visible, not buried | — |
| 15 | Design | Card visual hierarchy (Bebas 48px PSOS primary) | Mechanical | P5 | Without hierarchy card is a data dump | — |
| 16 | Design | Status dot states fully specified with tokens | Mechanical | P5 | Implementer would invent a mapping without spec | — |
| 17 | Design | PsosChangeBadge token spec (success/danger vars) | Mechanical | P5 | Prevents hardcoded-color violation | — |
| 18 | Design | "Aguardando primeira coleta" partial state | Mechanical | P1 | basket on + reports null is common first-week state | — |
| 19 | Design | Stale data warning (>10 days) | Mechanical | P1 | Silent stale data erodes trust in PSOS metric | — |
| 20 | Design | DiagnosticCTA trigger logic made explicit | Mechanical | P5 | "Recent audit" was undefined — implementer would guess | — |
| 21 | Design | DiagnosticCTA zero-credits path | Mechanical | P5 | Dead end in highest-anxiety user journey moment | — |
| 22 | Design | Accessibility checklist (ARIA + touch targets) | Mechanical | P1 | Zero accessibility spec = no keyboard/SR support | — |
| 23 | Design | Section layout labels for monitoring detail page | Mechanical | P5 | Prevents Card wrapper anti-pattern in implementation | — |
| 24 | Design | Phase 3D+4 as "generic SaaS filler" — USER CHALLENGE confirmed | Taste | P1 vs P3 | Second model independently flags same issue | — |
| 25 | Eng | Phase 0 backend prerequisites before Phase 1 UI | Mechanical | P5 | setMonitoringEnabled/updateAlertConfig have no auth ownership check — shipping toggle before fix is unsafe | TODOS only |
| 26 | Eng | updateAlertConfig: add psosDropThreshold + document merge semantics | Mechanical | P5 | Field silently dropped by schema; full-replace semantics wipe unrelated fields | — |
| 27 | Eng | visibilityReports auth check: add ownership verification | Mechanical | P1 | Any authenticated user can read another user's PSOS history | skip auth |
| 28 | Eng | DashboardNav: extend navLinks type with isActive() | Mechanical | P5 | Custom active logic for /sites/[id]/monitoring not expressible in current structure | — |
| 29 | Eng | audits.listBySite added to monitoring tab queries (DiagnosticCTA) | Mechanical | P5 | DiagnosticCTA trigger requires audit timestamp comparison — missing from query list | — |
| 30 | Eng | STALE_THRESHOLD_MS constant in monitoring-constants.ts | Mechanical | P5 | Magic number 10 days used in 2 places; constants prevent drift | inline magic number |
| 31 | Eng | N+1 subscriptions → TODOS.md (acceptable at <10 sites) | Mechanical | P3 pragmatic | 2N subscriptions for N sites; batch query deferred | block implementation |
| 32 | Eng | useCountUp progressive enhancement clarified | Mechanical | P5 | Phase 1 uses plain display; Phase 3D wraps — no import dependency | — |
| 33 | Eng | Cross-model: client-side monitoringEnabled filter → NOT IN SCOPE | Mechanical | P3 pragmatic | Both voices flag; acceptable at current scale; server-side index deferred | — |
| 34 | Final Gate | Phase 3D + 4A + 4B USER CHALLENGE → KEPT | Taste | User | User: polish supports conversion for unvalidated product tier | Cut |
| 35 | P5 CEO | audits.latestBySite missing → add as 5G prerequisite | Mechanical | P5 | Stats row "Média AEO" has no data source without this query | Skip stats |
| 36 | P5 CEO | 5D + 5F must ship atomically | Mechanical | P5 | Dual nav render is broken state; can't be split across commits | — |
| 37 | P5 CEO | Split 5 into: 5G → 5A → 5B+5C+5D+5F → 5E | Mechanical | P3 | Reduces risk of shipping broken shell; each step is verifiable | One big PR |
| 38 | P5 CEO | Stats row at 0 sites → show zeros with labels, no hide | Mechanical | P5 | Empty shell worse than zeros with labels for new users | Hide section |
| 39 | P5 Final | USER CHALLENGE: sidebar → TOP-NAV | User | User | User chose top-nav, Faturamento under avatar, add audit history nav | Sidebar |
| 40 | P5 Final | USER CHALLENGE: hero → KEEP for zero-sites | User | User | Hero stays when sites.length === 0; stats+table when sites > 0 | Remove entirely |
| 41 | P5 Final | Add Histórico /audits route to nav | Mechanical | P1 | User requested audit history nav item; low scope | — |

---

<!-- GSTACK REVIEW REPORT -->
## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 12 decisions, 6 scope additions |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR | 9 issues, 0 critical gaps remaining |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | 12 decisions, score improved |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** CEO + ENG + DESIGN CLEARED — all phases in scope. Ready to implement.

---
<!-- PHASE 5 REVIEW — autoplan 2026-04-29 -->
| Phase 5 CEO | dual-voice | Strategy | 1 | ISSUES | 2 user challenges, 4 mechanical fixes |
| Phase 5 Eng | subagent | Architecture | 1 | CLEAR | 2 hard blockers fixed in plan |
