I'll break down each page in a structured spec you can directly share. I'm using a **textual blueprint format** — it's precise enough for an AI partner to generate the UI code without ambiguity.

---

## 🗺️ Updated Page Map

| Route | Purpose |
|-------|---------|
| `/` (Dashboard) | Overview of all sites, mini audit score + monitoring indicator |
| `/monitoring` | Dedicated AI visibility command centre (all monitored sites) |
| `/sites/[siteId]` | **Auditoria tab** – full audit score, findings, chart, downloads |
| `/sites/[siteId]/monitoring` | **Visibilidade tab** – PSOS gauge, sparkline, monitoring alerts |
| `/sites/[siteId]/prompts` | Prompt basket management (brand name, prompts, enable/disable) |
| `/audit/[id]` | Single audit deep‑dive (existing, unchanged) |
| `/report/[token]` | Public shared report (existing, unchanged) |
| `/billing` | Credit packs and (later) monitoring subscription plans |
| `/sign-in` | Auth (unchanged) |

---

## 📄 Page‑by‑Page Breakdown

### 1. `/` – Dashboard

**Purpose**: High‑level overview of all user sites. Shows audit health and visibility status at a glance.

**Layout**:
- **Top ticker strip** (existing).
- **Hero section**:
  - Title: “SEUS SITES. SUA PRESENÇA NO ChatGPT.”
  - Stats row: `{totalSites}` Sites monitorados, `{avgAeoScore}` Média AEO, `{activeAlerts}` Alertas ativos.
  - Button: “+ ADICIONAR SITE”.
  - Plan label (FREE / X CRÉDITOS).
- **Site grid** (repeating cards, each card shows):
  - Site name, URL (truncated).
  - **Mini audit score badge** (latest score number, delta arrow from previous).
  - **Sparkline** of audit score history (last N audits, Recharts AreaChart).
  - **Mini PSOS indicator**: if monitoring enabled, show a tiny coloured dot (green/yellow/red) and the PSOS percentage. If not enabled, show “—”.
  - Critical/high finding count chips.
  - Footer: “Auditado {date}” or “Próx. {date}” and “VER →”.
- **Add site card** (empty slot with “+”).
- **Add site modal** (existing).

**Data**:
- `sites.listByUser`
- `audits.listBySite` per site (for latest score and sparkline)
- `visibilityReports.latestBySite` per site (for mini PSOS indicator)
- `users.getMyCreditsBalance` for plan label

**States**:
- Loading: skeleton cards.
- Empty: only add‑site card.
- No monitoring data: “—” for PSOS.

---

### 2. `/monitoring` – AI Visibility Command Centre (NEW)

**Purpose**: A real‑time dashboard exclusively for AI visibility (monitoring subscription product). Only shows sites with `monitoringEnabled: true`.

**Layout**:
- **Header**: “VISIBILIDADE EM IA” (Bebas Neue, large).
- **Subtitle**: “Acompanhe a presença da sua marca no Perplexity.”
- **Grid of monitored site cards** (one per site). Each card:
  - Site name (link to `/sites/[siteId]/monitoring`).
  - **PSOS gauge** (large percentage, coloured: green ≥60%, yellow ≥30%, red <30%).
  - **Confidence interval** in smaller text: “IC 95%: 45% – 55%”.
  - **Sparkline** of PSOS over last 8 weeks (SVG or Recharts) – uses `visibilityReports.listBySite`.
  - **Sample summary**: “14/35 amostras detectadas”.
  - **Status dot**: green if PSOS stable/up, yellow if slight drop, red if significant drop (compare with previous report).
  - **Link**: “Gerenciar prompts →”.
- **Empty state** (when no sites are monitored):
  - Message: “Nenhum site está sendo monitorado. Ative o monitoramento em um site para começar.”

**Data**:
- `sites.listByUser` filtered to `monitoringEnabled: true`
- `visibilityReports.latestBySite` per site
- `visibilityReports.listBySite` (limit 8) per site for sparkline

**Interactive**:
- Click card → `/sites/[siteId]/monitoring`.
- Button “Ativar monitoramento” → redirects to site’s visibility tab.

---

### 3. `/sites/[siteId]` – Auditoria Tab

**Purpose**: Deep‑dive into the site’s audit health. Everything related to the one‑time AEO audit and technical fixes.

**Layout**:
- **Back button** to Dashboard.
- **Hero**:
  - Site name, URL.
  - Large audit score number (with colour class).
  - Score breakdown: algorithmic base + LLM adjustment.
  - Severity chips (critical, high, medium, low counts).
  - Schedule & monitoring status indicator (text only: “Monitoramento ativo/pausado”).
- **Severity chip bar** (existing).
- **Score history chart** (Recharts AreaChart, last N audits).
- **Findings list** (existing):
  - Each finding: severity chip, type, description.
- **Audit‑specific alerts config** (moved here):
  - “Queda de score” (always active, shows threshold).
  - “Novos problemas críticos” toggle.
  - “Crawler de IA bloqueado” toggle.
- **Action buttons**:
  - “Ver auditoria completa →” (links to `/audit/[latestAuditId]`).
  - “Compartilhar relatório” (copies shareable link).

**Data**:
- `sites.getById`
- `audits.listBySite` (limit 12)
- `users.getMyCreditsBalance` (only for schedule / monitoring status)

**Alerts section**: uses `site.alertConfig` but only displays:
- `scoreDropThreshold`
- `criticalFindings`
- `crawlerBlocked`

---

### 4. `/sites/[siteId]/monitoring` – Visibilidade Tab (NEW)

**Purpose**: The monitoring subscription’s main interface for a single site. PSOS metrics, historical trend, and monitoring‑specific alert settings.

**Layout**:
- **Back button** to `/monitoring` or site audit tab.
- **Header**: “Visibilidade em IA” + “Monitoramento semanal · motor: Perplexity”.
- **PSOS section**:
  - `PsosGauge` component: large percentage, CI text, sample count.
  - `PsosSparkline` component: SVG sparkline of PSOS history.
  - “Últimas N semanas · atual X%” footnote.
- **Prompt basket summary**:
  - If no basket: message “Nenhum prompt configurado. Configure para começar a medir.” + button “Configurar monitoramento →”.
  - If basket exists: list of prompts (read‑only), brand name, engine. Button “Gerenciar prompts →”.
- **Monitoring alert config**:
  - “Alerta de queda de PSOS”: toggle + threshold input (`psosDropThreshold`). Description: “Alerta quando PSOS cair mais que X% comparado à semana anterior”.
  - (Future: multi‑engine voting toggle)
- **Enable/disable monitoring** toggle (already in schema, linked to subscription).

**Data**:
- `visibilityReports.latestBySite`
- `visibilityReports.listBySite` (limit 8)
- `promptBaskets.listBySite` (to see if configured)
- `sites.getById` (for alert config and monitoring enabled)

**Interactive**:
- Toggle monitoring on/off calls `sites.setMonitoringEnabled`.
- Modifying alert config calls `sites.updateAlertConfig` (only `psosDropThreshold` field).

---

### 5. `/sites/[siteId]/prompts` – Gerenciar Prompts

**Purpose**: CRUD for prompt baskets. Only accessible from monitoring tab.

**Layout** (existing, small adjustments):
- **Back button** to `/sites/[siteId]/monitoring`.
- **Header**: “Monitoramento de Visibilidade”.
- Form:
  - “Nome da marca” input.
  - Prompt list (max 5), with add/remove.
  - Explanation text: “7 amostras por prompt · motor: Perplexity · verificação semanal”.
- **Monitoring active toggle** (if basket already exists).
- **Save button** (create or update).

**Data**:
- `promptBaskets.listBySite` (to populate existing)
- Mutations: `promptBaskets.create`, `update`

**States**: Loading, new, edit existing.

---

### 6. `/audit/[id]` – Detailed Audit Report (unchanged)

**Purpose**: Read‑only view of a single audit run. Excluded from monitoring flow.

**Layout**: existing code, nothing to add. (Kept for completeness.)

---

### 7. `/billing` – Billing Page

**Purpose**: Two product lines (credits for audits, subscriptions for monitoring). For now, only credits.

**Layout** (existing):
- Title: “Créditos”.
- Credit packs (3 options).
- Success message on post‑checkout.
- Footer.

**Future addition**: below credit packs, a section “Planos de monitoramento” with Starter/Pro/Growth cards and “Assinar” buttons, or a link to a separate pricing page.

---

## 🧩 Navigation Bar Updates

The `DashboardNav` should now include:
- **Dashboard** (link to `/`) – active when on `/` or any `/sites/*`? Actually, we'll keep “Dashboard” as primary, but add a separate navigation item for “Monitoramento”. I recommend:
  - “Dashboard” (always goes to `/`).
  - “Monitoramento” (goes to `/monitoring`).
  - “Faturamento” (unchanged).

The “Monitoramento” link is highlighted when the current path starts with `/monitoring` or `/sites/*/monitoring`? That would be confusing; it's fine as a top‑level only.

---

## 🗺️ Component to Convex Query Mapping (Quick Reference)

| Component | Query / Mutation |
|-----------|------------------|
| Site grid, hero stats | `sites.listByUser`, `audits.listBySite`, `visibilityReports.latestBySite` |
| PSOS gauge | `visibilityReports.latestBySite` |
| PSOS sparkline | `visibilityReports.listBySite` |
| Audit score chart | `audits.listBySite` (score history) |
| Findings list | `audits.listBySite` → latest audit’s `outputFiles` |
| Alert config | `sites.getById` → `alertConfig`; mutation: `sites.updateAlertConfig` |
| Prompt basket | `promptBaskets.listBySite`; mutations: `create`, `update` |
| Monitoring toggle | `sites.setMonitoringEnabled` |

---
