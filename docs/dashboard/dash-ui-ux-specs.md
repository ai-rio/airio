Let's turn those UX opportunities into a precise **implementation blueprint**. I'll structure it so a coding agent (or your future self) can build each piece without ambiguity. Everything references your existing routes and components.

---

## 🎯 UI/UX Enhancement Specification

### 1. Empty‑State Education Cards

**Location:**  
- Dashboard `/` when `sites.length === 0` (replaces full‑page “+ Adicionar Site”)  
- Monitoring `/monitoring` when no site has `monitoringEnabled === true`

**Dashboard – Before first site:**
- Remove existing `AddSiteCard` as the sole empty state.
- Replace with a **Hero Empty State**:
  - Large icon or illustration (placeholder: a glowing AI‑search symbol).
  - Headline: “Apareça no ChatGPT antes do seu concorrente.”
  - Subhead: “Audite seu site agora ou monitore sua presença em IA para descobrir.”
  - Two CTA cards side by side:
    1. “Auditoria AEO” – description “Análise única do seu site com score, problemas e arquivos de correção.” Button: “Auditar meu site →” (opens AddSiteModal or inline audit URL input).
    2. “Monitoramento de Visibilidade” – description “Acompanhe toda semana em quantas buscas de IA sua marca aparece.” Button: “Ativar monitoramento →” (links to `/monitoring` or opens monitoring setup wizard).
  - (If user is not logged in, this empty state doesn't appear; handled by auth.)

**Monitoring page – No monitored sites:**
- Full‑page layout with:
  - Headline: “Você ainda não monitora nenhum site.”
  - Subhead: “Veja com que frequência sua marca é citada pelo Perplexity em perguntas reais do seu mercado.”
  - Illustration (e.g., a radar/sonar icon).
  - Two buttons: “Configurar primeiro monitoramento” (links to first site’s monitoring tab or site picker) and “Ver planos” (links to billing future section).
  - Below buttons: mini FAQ accordion with “O que é PSOS?”, “Como funciona o monitoramento?”, “Por que isso importa?”. Each expands to a short text (max 2 lines) and a “Saiba mais” link.

**Implementation:**
- Reusable `<EmptyState>` component taking `icon`, `title`, `description`, `actions` (array of buttons/links).
- `<EmptyStateDashboard>` and `<EmptyStateMonitoring>` as specialized wrappers.

---

### 2. PSOS Change Indicator

**Location:**  
- Dashboard site cards (mini PSOS area)  
- Monitoring page site cards  
- `/sites/[siteId]/monitoring` PSOS gauge section

**Behavior:**
- Compare `latestReport.psos` with `previousReport.psos` (where previous is the second most recent report from `visibilityReports.listBySite` with limit 2).
- Compute delta: `delta = current - previous`.
- If reports < 2: show nothing (first measurement).
- Show a badge next to the PSOS percentage:
  - Up: green background, “↑ +X pp” (percentage points).
  - Down: red background, “↓ –X pp”.
  - Stable (|delta| < 0.01): grey “estável” or hide.
- Tooltip on hover: “Comparado à medição anterior (semana passada).”

**Dashboard mini PSOS indicator:**
- Currently a coloured dot; replace with dot + change badge inline.
- If no monitoring, show “—”.

**Component:** `<PsosChangeBadge previousPsos={number} currentPsos={number} />` returns the styled badge or null.

---

### 3. Diagnostic Call‑to‑Action on Visibility Drop

**Location:**  
- `/sites/[siteId]/monitoring` – bottom of PSOS section.
- Monitoring page site cards (simplified version).

**Trigger:**  
- If `latestReport.psos` < `previousReport.psos` – `psosDropThreshold` (or a default 0.1) **and** the site has at least one audit that was completed *after* the previous visibility report, skip; otherwise, we infer the drop might be due to unresolved issues.

**Component: `<DiagnosticCTA>`**
- Alert box (border left red, light red background) with:
  - Headline: “Sua visibilidade caiu significativamente.”
  - Subtext: “Realize uma auditoria AEO para identificar problemas técnicos que podem estar prejudicando suas citações.”
  - Button: “Rodar auditoria agora →” (calls `runAudit` action after URL is pre‑filled from site data, or prompts user to confirm and deduct credits). Show cost (e.g., “usará 1 crédito”).
- **After audit completes**, the monitoring page could show a timeline overlay (could be phase 2), but for now, just a success toast and a link to the audit result.

**Alternative simpler CTA on monitoring cards (mobile):**  
- Small chip “Queda? Auditar” links directly to the site’s audit tab.

---

### 4. Upgrade Prompts & Gating for Free Users

**Assumptions:**  
- We have a `plan` field on `users` (already exists: `v.optional(v.string())`) that indicates current monitoring plan tier (e.g., `'free'`, `'starter'`, `'pro'`). For now, we can treat any user without an active monitoring subscription (`monitoringEnabled` cannot be toggled unless plan ≠ 'free' or a paid subscription exists) as free tier.
- The `sites.setMonitoringEnabled` mutation can be gated server‑side: if the user's plan doesn’t permit monitoring, throw an error.

**UI Gating:**
- On `/sites/[siteId]/monitoring`:
  - If site’s monitoring is not enabled and user has no active monitoring plan:
    - Show the PSOS gauge in a **locked state**: overlay with lock icon, blurred number, text “Disponível no plano de monitoramento”.
    - Button “Ver planos” (links to `/billing` or `#monitoring-plans` section).
    - Prompt management page: the toggle "Ativar monitoramento" is disabled; next to it a “Upgrade” link.

- On Dashboard mini PSOS indicator:
  - If site is not monitored and user lacks subscription, show a small lock icon instead of coloured dot, with tooltip “Ative o monitoramento”.

- On `/monitoring` page:
  - If the user has no monitored sites and no subscription, the empty state already educates and pushes to plans.

**Implementation:** Add a helper `canEnableMonitoring(userPlan)` and expose via `useQuery` of user plan; use its result in UI to conditionally render locked states.

---

### 5. Skeleton Loaders

**Purpose:** Provide perceived performance and reduce layout shift.

**Locations & Shapes:**
- Dashboard site cards (before `sites` query returns):  
  - `<SiteCardSkeleton>`: a rounded rectangle for site name, two short lines for URL, a large square for score, and a narrow rectangle for sparkline. Use pulse animation (`animate-pulse` from Tailwind).
- Site detail audit tab:  
  - Hero section: skeleton for site name, URL, large score number. Findings list: skeleton rows (each severity chip placeholder + two lines of text). Score chart area: grey placeholder box.
- Monitoring tab:  
  - PSOS gauge: large circle skeleton, two short lines for CI, sparkline placeholder. Prompt summary: circle and line skeletons.
- Monitoring dashboard (`/monitoring`):  
  - `<MonitoringCardSkeleton>` (similar to dashboard card but without score elements, only PSOS gauge and sparkline).

**Component:** Extend existing UI library with a `<Skeleton>` primitive (or use a simple `div` with `bg-muted animate-pulse rounded` class). Compose into card skeletons.

**Condition:** Show skeleton while respective `useQuery` returns `undefined`. Use explicit loading guard: `if (data === undefined) return <SkeletonVariant />;`.

---

### 6. Number‑Count Animation

**For PSOS gauge and audit score** (when they load or change).  
Use a simple custom hook `useCountUp(target, duration)` that updates a state value from 0 to target over the given duration using `requestAnimationFrame`. Display to 0 decimal places for score, 0 decimal for PSOS% when inside gauge.

**Implementation:**  
- `<AnimatedNumber value={psos*100} decimals={0} />` (and audit score with decimals 0).  
- Trigger animation on mount and when `value` changes (using key prop or effect with previous value comparison).

**Note:** Keep it subtle (duration 500-800ms). The animation should **not** run on every re-render; only when the displayed value changes.

---

### 7. Glossary Tooltips

**Terms:** “PSOS”, “IC 95%”, “Amostras detectadas”.

**UI:** A small info icon (ℹ) next to each term in the PSOS gauge area and on the monitoring page heading. On hover/click (touch), show a tooltip or popover with a concise definition.

**Definition strings:**
- PSOS: “Prompt‑Space Occupancy Score: a porcentagem de prompts (perguntas) em que sua marca foi citada pelo Perplexity.”
- IC 95%: “Intervalo de confiança de 95%: a faixa na qual a verdadeira visibilidade deve estar, considerando a amostragem.”
- Amostras detectadas: “Número de buscas (execuções) em que sua marca foi encontrada / total de buscas realizadas.”

**Component:** A small question mark icon that triggers a shadcn `Tooltip` (or a custom span with `title` attribute for simplicity). Group definitions in a constants file.

---

### 8. Mobile Responsiveness Tweaks

While not a full redesign, ensure key pages are usable on 375px width:

- Dashboard: site cards stack vertically (grid cols‑1), hero section stacks (score number above stats), “adicionar site” button full width.
- Monitoring dashboard: site cards full width.
- Site detail tabs: audit score large number size reduce (clamp down), findings list no side scroll.
- Prompt management: inputs full width, touch‑friendly spacing.
- Navigation: hamburger menu? (for now, keep horizontal but allow scroll; maybe hide “Faturamento” if too narrow). Just ensure no horizontal overflow.

**Implementation:** Use existing grid classes with `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]` so they automatically collapse. For hero, use `flex-col md:flex-row`. Add `responsive` variants to Tailwind where needed.

---

## ✅ Summary Checklist for Developer / AI Agent

| Enhancement | Key Component(s) | Route(s) |
|------------|-------------------|----------|
| Empty‑state education | `<EmptyStateDashboard>`, `<EmptyStateMonitoring>` | `/` (when no sites), `/monitoring` (when no monitored) |
| PSOS change badge | `<PsosChangeBadge>` | Dashboard cards, Monitoring cards, site monitoring tab |
| Diagnostic CTA on drop | `<DiagnosticCTA>` | Site monitoring tab, monitoring card (simplified) |
| Upgrade prompts & gating | `canEnableMonitoring()` check, locked UI | Site monitoring tab, prompt management, dashboard mini PSOS |
| Skeleton loaders | `<SiteCardSkeleton>`, `<MonitoringCardSkeleton>`, inline skeletons for detail pages | All data‑fetched views |
| Animated numbers | `useCountUp` hook, `<AnimatedNumber>` | PSOS gauge, audit score display |
| Glossary tooltips | `<InfoTooltip>` or span with title | PSOS area, monitoring heading |
| Mobile responsive | Grid/flex adjustments, no new components | Global |

