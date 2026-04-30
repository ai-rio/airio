You’re right. The original "ai-visibility-sprint.md" is more detailed — it has explicit sub‑tasks, acceptance criteria, and includes **Mobile & Responsiveness** and **Testing & QA** as dedicated tasks, which I omitted from the brief unified list. The AI Prompt Suggestion is the only missing piece from that original.

The answer is: **merge it properly** — keep the original’s structure and completeness, and inject the AI Prompt Suggestion as a new core feature with full sub‑tasks and acceptance criteria.

Below is the unified, complete sprint plan that combines everything.

---

## 🎯 Unified Sprint Goal (Final)

Launch the AI Visibility Monitoring module as a premium, statistically credible product that:
- Answers “Is my brand cited in AI search this week?”
- Shows competitive position vs. one competitor.
- Explains why visibility changed and suggests fixes.
- Onboards users with intelligent, AI‑generated prompt suggestions.

---

## 🏁 Sprint Duration & Assumptions

- **2 weeks** (10 working days)
- One developer (or small team) with Convex & Next.js knowledge
- All features are scaffolded; this sprint is implementation and wiring

---

## 🔴 Blocker – Do Before Any Code

| Task | Effort | Acceptance Criteria |
|------|--------|---------------------|
| **Legal clearance** | 0.5 day | Confirm via email/documentation that automated repeated querying (sampling) is permitted by Perplexity API ToS. If not, switch engine to one that allows it (e.g., Gemini). Go/no‑go. |

---

## 🟡 Core Monitoring Features (Must‑Have + High‑Priority Should‑Have)

| Epic / Feature | Sub‑Tasks | Effort | Acceptance Criteria |
|----------------|-----------|--------|---------------------|
| **Citation position tracking** | 1. Add `citationPosition` (number, 0 if absent, 1 if first mention) to `visibilitySnapshots` schema.<br>2. Update `samplePerplexity` to return position of first brand occurrence in response text.<br>3. Add `averagePosition` and `medianPosition` calculators to `lib/geo/stats.ts`.<br>4. Add `avgPosition` field to `visibilityReports` schema.<br>5. Show “Posição média” in PSOS gauge and monitoring UI. | 1 day | After sampling, snapshots contain `citationPosition`. Report shows average position across all prompts. |
| **Competitive benchmarking (1 competitor)** | 1. Add `competitors` array (max 3 strings) to `promptBaskets` schema.<br>2. Update `runSiteGeoCheck` to loop over competitor brands and sample each one using the same prompts.<br>3. Store competitor snapshots with a `brandName` field (add column to `visibilitySnapshots`).<br>4. Create `getCompetitorComparison` query that returns a ranked table (brand, PSOS, avg position, samples).<br>5. Add “Comparação” sub‑tab inside `/sites/[siteId]/monitoring` with the ranked table. | 2 days | Users can add 1 competitor brand and, after a monitoring cycle, see a sorted table of brand vs. competitor on each prompt. |
| **Dedicated `/monitoring` dashboard** | 1. Create `app/monitoring/page.tsx` using a `MonitoredSitesGrid` component.<br>2. Query all sites with `monitoringEnabled: true`, join latest `visibilityReports`.<br>3. Each card: site name, PSOS gauge, CI, sparkline, change badge, status dot, link to site monitoring tab.<br>4. Empty state if no monitored sites.<br>5. Skeleton loader while data loads. | 1.5 days | Route `/monitoring` renders grid of monitored sites with live PSOS data. |
| **Site monitoring tab finalisation** | 1. Move all monitoring UI from `sites/[siteId]/page.tsx` to new `sites/[siteId]/monitoring/page.tsx`.<br>2. Add PSOS gauge, sparkline, change badge, position info.<br>3. Add Diagnostic CTA when drop detected.<br>4. Add monitoring alert config (psosDropThreshold toggle).<br>5. Add “Gerenciar prompts” link. | 2 days | The Visibilidade tab is fully self‑contained; audit page no longer shows PSOS. |
| **Audit tab cleanup** | 1. Remove PSOS sections from `sites/[siteId]/page.tsx`.<br>2. Keep only audit alerts (scoreDropThreshold, criticalFindings, crawlerBlocked).<br>3. Add tab navigation (Auditoria / Visibilidade). | 1 day | Audit and monitoring are clearly separated in the UI. |
| **AI Prompt Suggestion** | 1. Backend: create `actions/suggestPrompts.ts` – takes site URL, crawled pages (title, pageType), and brand signals; calls OpenRouter to generate 5 industry‑relevant prompts in Portuguese.<br>2. Add internal mutation `promptBaskets.suggestPrompts` (or integrate into existing create flow).<br>3. UI: “Sugerir prompts com IA” button on the prompts configuration page. Calls action, displays suggestions, lets user select/edit before saving.<br>4. Fallback: if crawling data is unavailable, generate based on URL and brand name only.<br>5. Display suggestions in a clean list with checkboxes and an “Adicionar selecionados” button. | 1.5 days | Users see AI‑generated prompt suggestions, can select/deselect, and save. Setup time reduced to ~2 minutes. |

---

## 🟢 Monitoring Polishing (Should‑Have for Launch)

| Feature | Sub‑Tasks | Effort | Acceptance Criteria |
|---------|-----------|--------|---------------------|
| **PSOS Change Badge** | 1. Create `<PsosChangeBadge>` component: compares current vs. previous report, shows “↑ +X pp” green or “↓ −X pp” red.<br>2. Integrate into dashboard mini PSOS, monitoring cards, site monitoring tab. | 0.5 day | Users see direction of change at a glance. |
| **Diagnostic CTA on drop** | 1. Create `<DiagnosticCTA>` component: shown when PSOS drops > threshold.<br>2. Includes explanation and “Run audit” button that triggers audit on site URL (deducts credit). | 0.5 day | Users get a clear next action when visibility drops. |
| **Empty states** | 1. Dashboard empty state: hero message with two CTA cards (Audit, Monitor).<br>2. `/monitoring` empty state: educational message with FAQ accordion. | 0.5 day | New users are guided to value quickly. |
| **Skeleton loaders & animated numbers** | 1. Create `<SiteCardSkeleton>`, `<MonitoringCardSkeleton>`, inline skeletons for detail pages.<br>2. Implement `useCountUp` hook; use on PSOS and audit score displays.<br>3. Add glossary tooltips (PSOS, IC 95%) with info icons. | 1 day | Perceived performance improved; numbers animate on load; tooltips explain metrics. |
| **Gating for free users** | 1. Add `canEnableMonitoring()` check based on `users.plan` field.<br>2. In monitoring tab, show locked overlay with “Ver planos” button.<br>3. Disable monitoring toggle on prompt page for free users.<br>4. Update `setMonitoringEnabled` mutation to reject if plan doesn't allow. | 1 day | Free users see locked state and are prompted to upgrade. |

---

## 🔵 Multi‑Engine Support (Start in This Sprint, Complete Next)

| Task | Effort | Acceptance Criteria |
|------|--------|---------------------|
| **Gemini sampler** | 1.5 days (start this sprint, finish in next) | New `sampleGemini` function conforming to `IEngineSampler` interface. Integrated into `runSiteGeoCheck` alongside Perplexity. |

---

## 📱 Mobile & Responsiveness (Explicit Task)

| Task | Effort | Acceptance Criteria |
|------|--------|---------------------|
| **Responsive audit & monitoring pages** | 1 day | On 375px wide viewport: cards stack, hero sections wrap, inputs full width, no horizontal scroll. |

---

## 🧪 Testing & QA

| Task | Effort | Acceptance Criteria |
|------|--------|---------------------|
| **Unit tests for new stats functions (avgPosition, etc.)** | 0.5 day | Tests pass for edge cases. |
| **Integration test for full monitoring cycle** | 0.5 day | Manual run: create basket → wait for cron → verify snapshots & report appear → check UI. |

---

## 📊 Final Sprint Summary

| Category | Items | Total Effort |
|----------|-------|--------------|
| Blocker (legal) | 1 | 0.5 day |
| Core Features (7) | Citation position, competitive benchmarking, `/monitoring` dashboard, site tab finalisation, audit cleanup, AI prompt suggestion | 9 days |
| Polish & UX (5) | Change badge, diagnostic CTA, empty states, skeletons/animated/tooltips, gating | 4 days |
| Multi‑engine (start) | 1 | 1.5 days |
| Mobile & Testing | 2 | 2 days |
| **Total** | **16** | **~17 days** |

With tight timeboxing, a two‑week sprint can deliver the core features and most polish. The Gemini sampler may carry over.

---

