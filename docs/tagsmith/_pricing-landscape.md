# Tagsmith — Pricing Landscape

Source: Brave snippet scrape, 10 queries, Apr 2026.

## Schema Markup Tools

| Tool | Free tier | Paid entry | Mid | Top | Notes |
|------|-----------|------------|-----|-----|-------|
| **Merkle / TechnicalSEO.com** | 100% free | — | — | — | Dominant free generator. Manual form-fill. No AI. No site-wide. |
| **Schema App (enterprise)** | none | quote-only | quote | quote | Talk-to-sales tier. Likely $5k-50k/yr. AI-driven, agency focus. |
| **Yoast SEO Premium** (WP plugin) | free plugin | $99-129/yr/site | — | — | WordPress-only, bundled with broader SEO suite. |
| **Rank Math PRO** (WP plugin) | free plugin | $59/yr (renewal $107.88) | Business $335.88/yr | Agency $779.88/yr | WP-only. Multi-keyword + Content AI bundle. |
| **Schemantra** | unclear | subscription | + 20% reseller fees | — | Niche, smaller. |
| **Schema Plus** (Shopify app) | trial | $/mo varies | — | — | Shopify-only, multi-language. |

**Pricing gaps in market**:
- No standalone $9-29/mo SaaS for non-WordPress users (most paid options are WP plugins or enterprise)
- No AI auto-detect from URL → most charge for manual form-fill
- No usage-based plan for indie SaaS / Notion / Webflow / Ghost users
- PT-BR market: zero localized players

## OG Image Generators

| Tool | Free tier | Paid entry | Mid | Top | Notes |
|------|-----------|------------|-----|-----|-------|
| **Pictify, MyOGImage, OGImageMaker** | 100% free, no signup | — | — | — | Free static-template tools, no API, no automation |
| **OpenGraph.xyz** | unclear | paid | 1000 OG/mo per user + 500 alt text | — | Bundled with site audits + A/B test |
| **HTMLCSSToImage** | 50/mo free | — | — | — | Dev API focus, custom HTML/CSS input |
| **Placid.app** | 50 free | $19/mo | up to $249/mo, 4 tiers | $349/mo (200k images) | Templates + API + integrations |
| **Bannerbear** | 30 free | $49/mo Startup (1k API) | $149/mo Scale (10k) | $299/mo Enterprise (50k) | API-first, automation focus |
| **Vercel OG** | free | — | — | — | Dev-only (Next.js/Vercel) |

**Pricing gaps in market**:
- $9 tier missing — Bannerbear founder publicly argues against it ("don't charge $9/mo for SaaS")
- Sweet spot $19/mo is Placid-only at low volume
- $49 Bannerbear is the "API + automation" floor
- No URL-paste-to-OG for non-devs (all require template config first)
- PT-BR localized → none

## Recommended Tagsmith Pricing

Anchored to landscape gaps + your $700k-1.5M ARR target:

| Tier | Price | Schema | OG | Rationale |
|------|-------|--------|-----|-----------|
| **Free** | $0 | 5 URLs/mo, watermark on output, no monitor | 10 images/mo, watermark, 3 templates | Acquisition. Both tools must complete the verb on free. |
| **Pro** | $19/mo | unlimited URLs, no watermark, 5-site monitor, AI auto-detect | unlimited, no watermark, custom font/colors, A/B endpoint | Indie/marketer/blogger tier. Below WP plugins ($107/yr Rank Math = $9/mo) — must offer non-WP value. |
| **Agency** | $49/mo | 50-site monitor, white-label, API, bulk validate | bulk API, A/B test endpoints, custom domain hosted | Matches Bannerbear floor; competes with Schema App for low-end agencies. |
| **LTD launch** | $99 one-time | first 100 customers Pro lifetime | (acquisition seed) | One-shot. ~$10k cash + 100 founding users for Twitter/IH/PH SEO seed. |

## Why this pricing wins

- Free tier completes job → viral share + SEO landing-page conversion
- $19/mo undercuts every indie WP-plugin alternative for non-WordPress users
- $49/mo agency tier captures budget that would otherwise go to Schema App enterprise quote
- LTD seeds 100 founding customers (~$10k upfront) without permanent revenue dilution
- AI auto-detect at $19 is a wedge (no current $19/mo competitor offers this)

## Anti-patterns avoided

- No $9 tier (per Bannerbear's argument: $9 attracts bad-fit users, support drains margin)
- No metered API billing v1 (operational complexity not worth it)
- No 5-tier ladder (decision fatigue; 3 tiers + LTD is clean)
- No annual-only discount v1 (preserve cashflow predictability before churn baseline)
