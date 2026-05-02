# Pricing Rebuild — Model C (Mixed Cadence + Calibrated Tiers)

Pivot from airio credit-pack model (10/30/100 audits, BRL) to Tagsmith subscription tiers (USD canonical) per `_prd-tagsmith.md` §6.

## Why Model C (locked 2026-05-02)

Original draft used $19/$49/$99 inherited from indie SaaS folklore. Cost math against real LLM prices showed unit economics break:

- Pro $19/mo with daily × 4 premium engines × 10 prompts × 5 brands = ~$27/user/mo LLM cost → **negative gross margin**
- Substituting cheap models (Haiku, Flash, GPT-4o-mini) gives wrong scores — buyers see one number on ChatGPT.com and another in Tagsmith, churn fast
- Cheap-substitute escape hatch is fake; cost has to clear with consumer-grade models

Model C resolves with two levers:
1. **Bump prices modestly** — $19→$29 Pro, $49→$79 Agency, $99→$149 LTD — still 27x cheaper than HubSpot AEO enterprise (~$800/seat/mo equivalent)
2. **Mixed engine cadence** — Gemini Flash daily change-detection + premium engines (GPT-4o, Sonnet, Sonar Pro) weekly full audits. Same 4-engine coverage, 1/4 the cost.

Per-Pro-user LLM cost target: <$6/mo. Margin: ~$23/user. Sustainable.

## Target state (PRD-locked, Model C)

| Tier | Price | Type | Features | LLM cost target |
|------|-------|------|----------|-----------------|
| Free | $0 | — | 5 schema gens/mo (watermarked), 10 OG images/mo (watermarked), 1 AEO brand × 3 auto-prompts × 2 LLMs (ChatGPT GPT-4o + Perplexity Sonar) × weekly check | <$0.10/user/mo |
| Pro | **$29/mo** | Subscription (Dodo) | Unlimited schema (static-first + Haiku fallback), unlimited OG (no watermark, custom font/color/logo + A/B endpoint), 5 brands × 10 auto-prompts × 4 LLMs with **mixed cadence** (Gemini Flash daily change-detection + GPT-4o / Claude Sonnet / Sonar Pro weekly full audits) + alerts + **confidence intervals** + 5-site monitor (shared across Schema + AEO) | <$6/user/mo |
| Agency | **$79/mo** | Subscription (Dodo) | Pro + 20 brands × 50-site monitor, white-label monitor email, REST API key auth (`POST /api/v1/schema`, `POST /api/v1/og`), bulk sitemap.xml validate, AEO competitor benchmarking, custom hosted OG domain via CNAME | <$20/user/mo |
| LTD | **$149** | One-time, capped at 100 seats | Pro forever; flag `is_lifetime_pro: true`; UI shows live count remaining ("87 of 100 left"); after 100 sold the LTD purchase route 410s. Total seed cash: $14.9k | <$6/user/mo (lifetime ceiling enforced) |
| Pro annual | $290/yr | 17% off vs $29 × 12 | Same as Pro, paid yearly | — |
| Agency annual | $790/yr | 17% off vs $79 × 12 | Same as Agency, paid yearly | — |

## Why these specific numbers

**$29 Pro (vs $19 earlier):**
- Anchor pricing: $19 reads "indie tool I'll cancel." $29 reads "real product I'm using." AppSumo + indie SaaS data supports $29 minimum tier.
- Margin headroom for support, infra growth, model price increases.
- Solo founder time has value. $19 with $14 margin × 100 customers = $1.4k/mo (unsustainable). $29 with $23 margin × 100 = $2.3k/mo (path to $10k MRR clearer).

**$79 Agency (vs $49 earlier):**
- Agency reseller charges client $200-500/site/mo. They absorb $79 trivially.
- 20-brand monitoring × 5 engines × calibrated cadence = real cost ~$15-20/user. $79 = $59-64 margin per agency seat.
- Doubles per-customer LTV vs $49 with no perceived friction at this buyer tier.

**$149 LTD × 100 cap (vs $99 earlier):**
- LTD = lifetime LLM cost exposure (~$5/mo × forever). $99 LTD pays back month 4; everything past = pure cost. $149 LTD pays back month 6, cleaner runway.
- Cap stays at 100. Total seed cash: $14.9k vs $9.9k. Funds two rounds of work.
- Second wave (if cap unhit by week 8) at $199.

## Cost-control engineering (non-negotiable)

| Mechanism | Purpose | Implementation |
|---|---|---|
| Per-user LLM spend ceiling | Block runaway accounts | Convex action checks `user.llmSpendThisMonth`; alert at $10, hard cap at $15 |
| 24h prompt cache | Cut duplicate calls ~30% | Cache key = SHA(prompt + engine + model); TTL 86400s |
| Per-tier rate limits | Soft-throttle abuse | Pro hits 5,000 calls/mo → soft throttle, surface upgrade |
| Engine fallback | Don't burn user quota on infra | Sonnet error → GPT-4o; both error → retry queue |
| Cost dashboard (founder + user) | Visibility = the moat against bleed | Convex action logs `tokensIn`, `tokensOut`, `costUsd`, `engine`, `userId`; daily summary email to founder; user-facing dashboard surfaces cost |
| Manual abuse review queue | Flag accounts >$25/mo cost | Likely abuse or bug; reach out before billing cycle |

## Backend work to land this

### Schema (`convex/schema.ts`)
- Add `users.subscriptionTier`: `'free' | 'pro' | 'agency'`
- Add `users.isLifetimePro: boolean` (LTD flag, never expires)
- Add `users.subscriptionId` (Dodo subscription id) and `users.subscriptionRenewsAt`
- Add `users.schemaUsageThisMonth`, `users.ogUsageThisMonth`, `users.lastUsageReset`
- Add new table `ltdPurchases` (or counter doc) for the 100-seat cap — atomic increment on purchase
- Decide migration path for legacy `users.credits` and credit pack tables: drop fields (no real users) or widen-then-narrow
- Reset `usageLogs` schema if shape changes

### Checkout (`convex/actions/checkout.ts`, `convex/billing.ts`)
- Two checkout paths: subscription (Pro / Agency monthly) vs one-time (LTD)
- Replace credit-pack product ID env vars with `DODO_PRO_PRODUCT_ID`, `DODO_AGENCY_PRODUCT_ID`, `DODO_LTD_PRODUCT_ID`
- LTD route: server-side seat check before opening Dodo session, return 410 if cap reached
- Stripe-style customer portal link for cancel/update payment
- Idempotency on subscription state writes

### Webhooks (`convex/http.ts`)
- Handle subscription lifecycle: created → active, payment_failed → past_due, cancelled → revert to free at period end
- Handle one-time LTD purchase event → flag user, decrement counter
- Use a webhook event id table to drop duplicate deliveries

### Usage gating (`convex/users.ts`)
- Replace `checkAndConsumeUsage` with tier-aware gate:
  - Free: count per-tool monthly cap (5 schema, 10 OG, 1 AEO check/wk)
  - Pro / Agency: unlimited per-tool, but enforce site-monitor cap (5 / 50)
  - LTD: same surface as Pro
- Reset monthly counters via existing cron, scoped by tier rules

### UI
- `site/app/page.tsx` PLANS array → 3 subscription tiers + LTD callout banner with live counter
- `dashboard/app/billing/page.tsx` products array → tier upgrade buttons + Stripe portal link + LTD purchase card with seat counter
- Pricing modals + upgrade prompts on free-tier ceilings (5/10/1 hits)
- "Anti-snakeoil" copy on every pricing surface — *"AI visibility + the fixes that move the needle, at $29/mo. HubSpot AEO is enterprise-only."* Plus per-card cost-target footnote ("Why $29? Real LLM cost ~$6/user/mo. We're transparent about margin.").
- LTD page route returning 410 once cap reached

### Marketing surfaces (PRD §9)
- Pricing card sticky on tool pages
- Free-tier upgrade prompt copy
- LTD seat counter component, public

### Tests
- LTD cap race condition: simulate 100 concurrent purchases, assert seat 101 rejects
- Usage gate per-tier: free user hits 5 schema, 6th rejects
- Webhook duplicate event: assert no double-flag
- Subscription cancel at period end → free downgrade after period

## Sequencing

Recommend single dedicated session (Day 2 of pivot per `_pivot-plan.md`). Order:

1. Schema additions + migration plan (add new fields alongside legacy)
2. `users.checkAndConsumeUsage` rewrite + tests
3. Checkout subscription + LTD flows + tests
4. Webhook handlers + idempotency + tests
5. UI swap on `site/app/page.tsx` + `dashboard/app/billing/page.tsx`
6. LTD seat counter + 410 route
7. Drop legacy credit pack fields and tables (narrow phase)
8. End-to-end smoke test against Dodo test_mode

## Current state pinned in repo

- BRL credit-pack literals still present in `site/app/page.tsx:18-20` and `dashboard/app/billing/page.tsx:10-12`
- Backend checkout still references `DODO_CREDITS_10/30/100_PRODUCT_ID` env vars
- `users.credits` field still in schema, still decremented in audit flow
- No `ltdPurchases` counter, no subscription tier field

These literals are intentionally untouched until the rebuild lands as a coherent unit.
