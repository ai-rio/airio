# Pricing Rebuild — Deferred Day 2+ Task

Pivot from airio credit-pack model (10/30/100 audits, BRL) to Tagsmith subscription tiers (USD) per `_prd-tagsmith.md` §6.

## Why deferred

Pass 3 of the Day 1 scrub was scoped narrowly to currency display. A real conversion is half-day work because:

1. Backend checkout flow hits Dodo with credit-pack product IDs — UI-only swap leaves the click broken end-to-end
2. Schema, `users` fields, usage gating, and webhook handlers all encode the credit-pack model
3. PRD introduces an LTD tier with a 100-seat server-enforced cap that doesn't exist yet
4. Free-tier limits change shape: 1 audit/month → 5 schema/mo + 10 OG/mo + AEO weekly check
5. Mid-pivot half-broken state is worse than a clean cut

airio is not live, so there's no user-facing regression risk — but committing a half-rebuild creates noise for future agents.

## Target state (PRD-locked)

| Tier | Price | Type | Features |
|------|-------|------|----------|
| Free | $0 | — | 5 schema gens/mo (watermarked output), 10 OG images/mo (watermarked), 1 AEO check/wk on 1 brand × 3 prompts in 1 LLM |
| Pro | $19/mo | Subscription (Dodo) | Unlimited schema, unlimited OG (no watermark, custom font/color/logo + A/B endpoint), AEO unlimited prompts × 3 LLMs (ChatGPT, Claude, Perplexity) weekly + alerts, 5-site monitor (shared across Schema + AEO) |
| Agency | $49/mo | Subscription (Dodo) | Pro + 50-site monitor, white-label monitor email, REST API key auth (`POST /api/v1/schema`, `POST /api/v1/og`), bulk sitemap.xml validate, AEO competitor benchmarking, custom hosted OG domain via CNAME |
| LTD | $99 | One-time, capped at 100 seats | Pro forever; flag `is_lifetime_pro: true`; UI shows live count remaining ("87 of 100 left"); after 100 sold the LTD purchase route 410s |

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
- "Bundle math" copy on every pricing surface — *"Schema gen + OG + AEO at $19/mo. Pictify alone is $39."*
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
