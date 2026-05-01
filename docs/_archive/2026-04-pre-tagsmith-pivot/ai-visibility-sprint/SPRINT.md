# AI Visibility Monitoring Sprint — Master Plan

> **Branch:** `feat/monitoring-platform`
> **Date:** 2026-04-29
> **Stack:** Next.js 15, Convex, Tailwind 4, shadcn/ui
> **For agentic workers:** Execute plans in wave order. Wave 2 plans require Wave 1 complete. Within a wave, plans are parallel-safe unless file conflicts noted.

---

## Sprint Goal

Ship the AI Visibility Monitoring module as a statistically credible, monetised product:
- Brand citation tracking with position data
- Competitive benchmarking (Growth+ plan)
- AI-generated prompt suggestions (PT-BR)
- Plan-gated access with BRL pricing

---

## What Is Already Done (Do Not Re-implement)

| Component | Location |
|-----------|----------|
| `/monitoring` dashboard (site grid, PSOS, sparkline, empty state) | `dashboard/app/monitoring/page.tsx` |
| `/sites/[siteId]/monitoring` (header, PSOS gauge+badge+sparkline, prompt config, alert config, diagnostic CTA) | `dashboard/app/sites/[siteId]/monitoring/page.tsx` |
| `PsosChangeBadge`, `PsosGauge`, `PsosSparkline` | `dashboard/components/` |
| `InfoTooltip`, `AnimatedNumber`, `useCountUp`, `skeleton`, `glossary` | `dashboard/components/` + `dashboard/lib/` |
| Empty states (EmptyStateMonitoring, EmptyHero) | built |
| Perplexity ToS legal clearance | ✅ confirmed — Sonar API programmatic use allowed |

---

## Wave Map

```
WAVE 1 (parallel, no deps)
  ├── W1-01: Schema migrations        → convex/schema.ts
  └── W1-02: Audit tab cleanup UI     → sites/[siteId]/page.tsx

WAVE 2 (depends on W1-01 complete)
  ├── W2-01: Citation position backend → sampler.ts, stats.ts, geoMonitoring, visibilityReports
  ├── W2-02: Competitive benchmarking  → geoMonitoring, visibilityReports (new query)
  └── W2-03: AI Prompt Suggestion      → convex/actions/suggestPrompts.ts (no schema dep)

WAVE 3 (depends on W2 complete)
  ├── W3-01: Monitoring UI additions   → sites/[siteId]/monitoring/page.tsx
  ├── W3-02: AI Prompts UI             → sites/[siteId]/prompts/page.tsx
  └── W3-03: Pricing page              → dashboard/app/pricing/page.tsx (new route)

WAVE 4 (depends on W1-01 + W3 complete)
  └── W4-01: Plan gating               → convex/users.ts, convex/sites.ts, monitoring UI

WAVE 5 (next sprint — carry over)
  ├── W5-01: Gemini sampler            → convex/lib/geo/sampler.ts + schema engine union
  ├── W5-02: Mobile responsiveness     → monitoring + audit pages at 375px
  └── W5-03: Unit tests                → convex/lib/geo/__tests__/
```

---

## Pricing — BRL (Monitoring Subscriptions)

Separate product line from audit credit packs. Subscriptions via DodoPayments.

| Plan | BRL/mês | Sites | Prompts | Engines | Competitor tracking | Notes |
|------|---------|-------|---------|---------|---------------------|-------|
| Starter | R$579 | 1 | 5 | 1 | ❌ | Basic dashboard |
| Pro | R$1.449 | 3 | 15 | 2 | ❌ | PSOS trends + alerts |
| Growth | R$2.899 | 10 | 30 | 3 | 3 per site | Competitor benchmarking |
| Enterprise | a partir de R$8.700 | Unlimited | Unlimited | All | Custom | White-label + API |

**Conversion rate:** ~R$5.75/USD (rounded to clean BRL)
**Original USD:** Starter $99 · Pro $249 · Growth $499 · Enterprise from $1,500

### Gating Rules
- Monitoring access: any paid plan (`users.plan !== undefined`)
- Multi-engine (2+ engines): Pro+
- Competitor benchmarking: Growth+
- White-label / API: Enterprise only
- `users.plan` values: `'starter' | 'pro' | 'growth' | 'enterprise'`

---

## Plan Files

| File | Wave | Description |
|------|------|-------------|
| [W1-01-PLAN.md](./W1-01-PLAN.md) | 1 | Schema migrations (5 changes, all `v.optional()`) |
| [W1-02-PLAN.md](./W1-02-PLAN.md) | 1 | Audit tab cleanup — remove PSOS from sites page, add tab nav |
| [W2-01-PLAN.md](./W2-01-PLAN.md) | 2 | Citation position — sampler + stats + wire-up |
| [W2-02-PLAN.md](./W2-02-PLAN.md) | 2 | Competitive benchmarking backend |
| [W2-03-PLAN.md](./W2-03-PLAN.md) | 2 | AI Prompt Suggestion action |
| [W3-01-PLAN.md](./W3-01-PLAN.md) | 3 | Monitoring UI — position display + competitor sub-tab |
| [W3-02-PLAN.md](./W3-02-PLAN.md) | 3 | AI Prompts suggestion UI |
| [W3-03-PLAN.md](./W3-03-PLAN.md) | 3 | Pricing page — BRL tiers + DodoPayments links |
| [W4-01-PLAN.md](./W4-01-PLAN.md) | 4 | Plan gating — helpers, overlays, mutation guards |

---

## Definition of Done (Sprint Level)

- [ ] Schema deployed to Convex without breaking existing rows
- [ ] Citation position visible in monitoring page after a sampling run
- [ ] Competitor snapshots stored with `brandName`; comparison tab renders ranked table
- [ ] "Sugerir prompts com IA" generates 5 PT-BR prompts from site data
- [ ] `/sites/[siteId]/page.tsx` has Auditoria/Visibilidade tabs; no PSOS in audit tab
- [ ] `/pricing` route renders 4 BRL plan cards with correct limits
- [ ] Free users see locked overlay; `setMonitoringEnabled` rejects on free plan
- [ ] Build clean (`bun run build` exits 0, Biome lint clean)
