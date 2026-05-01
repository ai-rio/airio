# Tagsmith v1 — Product Requirements Document

## 1. Feature Name

**Tagsmith** — a toolkit SaaS with three URL-paste utilities for site SEO + social sharing + AI visibility: Schema Markup Generator (lead), OG Image Generator, AEO Citation Tracker. Single brand, shared auth/billing, complementary tools. Pivoted from existing `airio` codebase (Convex + Next.js + Dodo) to compress build time and deliver 3-tool launch parity vs OpenGraph.xyz's 6-tool bundle.

## 2. Epic

- Parent thesis: `/home/carlos/apps/airio/docs/tiiny-pattern-ideas.md`
- Brand selection rationale: `/home/carlos/apps/airio/docs/tagsmith/SCOREBOARD.md` (#5 Schema 76/100, #2 OG 68/100)
- Pricing landscape evidence: `/home/carlos/apps/airio/docs/tagsmith/_pricing-landscape.md`
- SERP incumbent map: `serp.db` (markup-generator + og-image rows)
- Architecture doc: TBD post-PRD

## 3. Goal

### Problem

Non-WordPress site owners (Notion blogs, Webflow sites, Ghost publishers, indie SaaS marketing sites, headless-CMS users) hit two recurring technical walls:

1. **Schema markup**: Free generators (Merkle, TechnicalSEO.com) require manual form-fill for every entity on every page. WordPress users get auto-schema via Yoast/Rank Math, but non-WP users have no equivalent — they must hand-write JSON-LD or pay for enterprise Schema App. AI-driven auto-detect from URL is nonexistent at the indie-SaaS price point.
2. **Open Graph images**: Free template tools (Pictify, MyOGImage, OGImageMaker) lack automation, brand control, and per-page dynamic generation. Vercel OG is dev-only. Bannerbear/Placid start at $19-49/mo and require pre-built templates rather than URL-paste workflows.

Both pains share an audience (SEO marketers, indie founders, non-tech bloggers, small agencies) and a workflow archetype (paste a URL → get an artifact → paste it into your site or sharing meta). No single brand owns both gaps.

### Solution

**Tagsmith is a Schema Markup Generator first.** OG Image Generator and AEO Citation Tracker are companion tools in the same paste-URL-get-artifact workflow, bundled to deepen the SEO toolkit and raise switching cost. Marketing, SEO targeting, and product hierarchy lead with Schema; OG and AEO are framed as included extras, not parallel headline products.

All three tools complete their job in under 30 seconds without configuration:

- **Schema Markup Generator (lead)** — Paste any URL → static-first parser (cheerio: existing JSON-LD, microdata, OG/Twitter meta, semantic HTML) emits JSON-LD for the 10 highest-value schema types (Article, Product, FAQ, LocalBusiness, Recipe, Event, Review, HowTo, Organization, Person). Anthropic Haiku fallback only for ambiguous entities. Includes validator against schema.org spec + Google Rich Results heuristic. SERP incumbents are form-fill tools (TechnicalSEO, RankRanger, Attrock); URL-paste + AI auto-detect + free CLI = clear UX wedge.
- **OG Image Generator (companion)** — Paste any URL → tool extracts title/description/site-name → renders branded OG image via 3 starter templates. Pro tier unlocks custom font, color, logo, A/B variant endpoint. Positioning: included in toolkit so non-dev marketers don't pay Pictify ($39/mo API engine) or wire Vercel OG. Not a standalone OG product.
- **AEO Citation Tracker (moat)** — Paste URL + brand → tool auto-generates 3-5 specialized prompts from category/content (no user prompt authoring) → checks Gemini / ChatGPT / Claude / Perplexity to see whether your brand appears in their answers. Alerts on first appearance, disappearance, and position deltas. Reuses existing airio PSOS pipeline; renamed and repositioned for Tagsmith bundle. Zero direct competitors at indie price; highest CPC in scoreboard (R$50.84). Promoted to homepage secondary hero slot to claim category before incumbents emerge.

### Impact

| Metric | 24-mo target | 36-mo target |
|--------|-------------|-------------|
| MRR | $25k | $60k |
| ARR | $300k | $720k |
| Top-funnel monthly visits (organic) | 12k | 40k |
| Free-to-Pro conversion | 4-6% | 5-7% |
| Pro-to-Agency upgrade | 8-12% | 10-15% |
| LTD seats sold (one-time, week 4 launch) | 100 × $99 = $9.9k cash | n/a |

## 4. User Personas

1. **Indie SaaS Founder (primary)**
   - Solo or 2-3 person team, ships landing pages on Next.js / Astro / Webflow / Ghost
   - Hates writing JSON-LD by hand
   - Pays $19/mo without thinking; rejects $9 as "low-quality" signal
   - Cares about SEO ranking + clean social previews

2. **SEO-Focused Marketer / Consultant**
   - Manages 2-15 client sites, mostly non-WordPress
   - Wants white-label output and multi-site monitoring
   - Pays $49-99/mo per agency seat without hesitation
   - Will buy LTD if positioned as "founding member"

3. **Non-Technical Blogger (EN + PT-BR + ES)**
   - Notion site, Substack, Ghost, custom HTML
   - Doesn't know what JSON-LD is but knows "Google rich results" matters
   - Free tier likely ceiling; converts only when traffic justifies $19/mo
   - Native-language UX increases trust in PT-BR + LATAM ES markets where most SEO tools are EN-only

## 5. User Stories

### Schema Markup Generator

- As an **indie founder**, I want to paste my landing page URL and get correct JSON-LD in 10 seconds, so I can ship structured data without learning the schema.org spec.
- As an **SEO consultant**, I want to monitor 5+ client sites and get notified when their schema breaks, so I can fix issues before clients notice.
- As a **non-tech blogger**, I want a one-click "copy to clipboard" of the JSON-LD snippet, so I can paste it into my site builder's `<head>` injection without confusion.
- As a **free user**, I want to validate my own hand-written JSON-LD against schema.org and Google Rich Results spec, so I can catch errors before deploy.

### OG Image Generator

- As an **indie founder**, I want to paste a URL and get a branded OG image without configuring a template first, so I don't spend 20 minutes per page.
- As an **agency user**, I want a hosted endpoint that returns OG images per URL with my brand applied, so I can wire it into client sites once and forget.
- As a **marketer**, I want to A/B test two OG variants per URL with click-through tracking, so I can measure which thumbnail wins.
- As a **free user**, I want a clear watermark indicating the image was made with Tagsmith, so I'm reminded the brand exists when I outgrow the free tier.

### Account / Billing / Brand

- As a **paying user**, I want one account that covers both tools, so I don't manage two subscriptions.
- As a **prospect**, I want to see clear pricing tiers and a free path to "complete the job", so I can evaluate without giving a credit card.
- As a **founder buying LTD**, I want a one-time $99 charge to lock Pro forever, so I can support a young product and lock my unit cost.

### Brand / Domain Flexibility

- As an **operator (you)**, I want the brand domain configured via environment variable, so I can switch from `tagsmith.com` to `tagsmith.io` to `tagsmith.app` without touching application code.

## 6. Requirements

### 6.1 Functional Requirements

#### Schema Markup Generator

- Accept any public URL via paste/text input.
- Fetch the URL server-side, extract HTML body + existing meta + visible text.
- **Static-first extraction pipeline** (skillui-inspired): parse existing JSON-LD `<script>` blocks, microdata, RDFa, OpenGraph + Twitter Card meta tags, semantic HTML (article, breadcrumb, FAQ Q+A patterns) directly via `cheerio` — emit JSON-LD without LLM call when sufficient signal is present.
- **LLM fallback** to Anthropic Haiku (`claude-haiku-4-5-20251001`) ONLY for ambiguous entities or when static extraction yields no usable schema. Static-first reduces LLM cost ~70% and median latency from 8s → <1s.
- Detect schema type relevance (e.g., page is a recipe → emit Recipe; page is a product → emit Product); emit only types the LLM identifies as appropriate.
- Return JSON-LD output in a copyable code block, plus an "embed in <head>" snippet wrapper.
- Run the generated JSON-LD against schema.org spec validation locally + a Google Rich Results check (best-effort: spec validation done locally with a JSON Schema lib; "Rich Results" check is a heuristic flagger, not a true Google API call in v1).
- Free tier limit: 5 URL classifications per calendar month per account. Outputs include a comment line `<!-- generated by Tagsmith -->`. No site-wide monitoring.
- Pro tier: unlimited URLs, no comment line, monitor up to 5 sites (one daily re-check + email alert on breakage), AI auto-detect (default behavior — no manual type selection).
- Agency tier: unlimited URLs, monitor up to 50 sites, white-label (no Tagsmith mention in monitor email), API endpoint (`POST /api/v1/schema` with API key), bulk validate (paste a sitemap.xml URL → validate all pages overnight).
- Support EN + PT-BR + ES UI (i18n via standard Next.js `next-intl` or equivalent). ES targets full LATAM (Mexico, Argentina, Colombia, Chile, Peru) + Spain; same code, locale-specific landing pages.

#### OG Image Generator

- Accept any public URL via paste/text input.
- Fetch the URL server-side, extract `<title>`, `<meta description>`, `<meta og:title>`, `<meta og:description>`, site name, favicon.
- Render OG image at 1200×630 using 3 v1 templates (minimal, bold, brand-card).
- Free tier: 10 images per calendar month, watermark "Made with Tagsmith" lower-right, no custom fonts/colors.
- Pro tier: unlimited images per month, no watermark, custom font (Google Fonts allowlist), custom hex colors, custom logo upload, A/B variant endpoint (returns 2 OG images per URL with deterministic seeding).
- Agency tier: bulk API (`POST /api/v1/og` with API key), per-key analytics, custom hosted domain (`og.client-domain.com` via CNAME).
- Output formats: PNG download + embed URL (`https://{TAGSMITH_DOMAIN}/og/{slug}.png`).

#### Free CLI distribution (v1)

- Ship `npx tagsmith` CLI on npm at v1 launch (week 4) alongside hosted SaaS.
- CLI runs **static-first extraction only** (no API key required, no LLM call) — paste URL, get JSON-LD locally.
- Output: JSON-LD code block to stdout + optional `--out file.json`.
- README links to hosted SaaS for AI auto-detect, monitoring, OG generator, citation tracker.
- Distribution: npm install count + GitHub stars become SEO trust signals; CLI users convert to hosted when they want monitoring/multi-site/AI fallback.
- License: MIT, source on GitHub. Skill loadout pattern modeled on skillui (`amaancoderx/npxskillui`).

#### Account / Billing

- Email + password auth (Convex auth).
- Single account covers both tools; tier applies globally.
- Stripe Checkout for Pro/Agency monthly subscriptions (no annual v1).
- Stripe Payment Link for LTD ($99 one-time); LTD users flagged with `is_lifetime_pro: true` in users table; no recurring charge.
- Customer portal link (Stripe-hosted) for canceling/updating payment.
- LTD cap of 100 seats enforced server-side; UI shows live count remaining ("87 of 100 LTD seats left").

#### Brand / Domain Configuration

- Domain extension and full base URL stored in environment variable (`TAGSMITH_BASE_URL`, e.g. `https://tagsmith.com` or `https://tagsmith.io`).
- All generated embed URLs, email-from addresses, OG image URLs, and outbound links use this env var.
- No domain hardcoded in source.

### 6.2 Non-Functional Requirements

- **Performance**: Schema generation static-hit p95 < 1s (HTML fetch + cheerio); LLM-fallback path p95 < 8s. OG image render < 3s p95. Track static-hit rate as KPI; target ≥70% by month 3.
- **Reliability**: 99% uptime (Convex managed); schema validation degrades gracefully if Google Rich Results heuristic fails (return JSON-LD anyway, flag as "spec-only validated").
- **Security**: HTML fetch must use a hardened HTTP client with private-IP blocking (no SSRF to `127.0.0.1`, `10.0.0.0/8`, AWS metadata endpoints). API keys hashed in DB; rate-limited per-key.
- **Privacy**: No persistent storage of fetched page content beyond the generated artifact. Logs of URLs fetched are kept ≤30 days for abuse handling.
- **Accessibility**: WCAG 2.1 AA on UI (semantic HTML, keyboard navigation, color contrast).
- **i18n**: EN + PT-BR + ES strings on launch; copy stored in JSON, not hardcoded.
- **Observability**: Convex action logs for every URL fetch + LLM call; alert on >5% LLM error rate; track tier upgrades + downgrades + LTD purchases.
- **Cost ceiling**: Anthropic Haiku spend < $0.03 per Pro user per month at typical use (static-first reduces LLM dependency); throttle if a single account exceeds 1,000 schema generations/day (likely abuse).

## 7. Acceptance Criteria

### Schema Generator

- [ ] **Given** a free user, **when** they paste a Wikipedia article URL, **then** they get a valid JSON-LD `Article` + `Person` block within 10s, with `<!-- generated by Tagsmith -->` comment.
- [ ] **Given** a free user who has used 5 URLs this month, **when** they try a 6th, **then** they see an upgrade prompt and the generator is blocked.
- [ ] **Given** a Pro user, **when** they generate any URL, **then** output has no Tagsmith comment.
- [ ] **Given** a Pro user, **when** they add a site to monitor, **then** the site is re-fetched daily and an email is sent on schema breakage.
- [ ] **Given** an Agency user, **when** they POST to `/api/v1/schema` with their key + URL, **then** they get JSON-LD as JSON response within 8s.
- [ ] **Given** any user, **when** they paste their own JSON-LD into the validator, **then** they see schema.org spec violations highlighted by line + a Rich Results heuristic verdict.
- [ ] **Given** a malicious URL (`http://127.0.0.1`, `http://169.254.169.254`), **when** any user submits it, **then** the request is rejected before fetch with "URL not allowed".

### OG Image Generator

- [ ] **Given** a free user, **when** they paste a URL, **then** they get a 1200×630 PNG with watermark within 3s.
- [ ] **Given** a free user who has used 10 images this month, **when** they try an 11th, **then** they see an upgrade prompt.
- [ ] **Given** a Pro user, **when** they configure custom logo + colors + font, **then** subsequent OG images use those settings.
- [ ] **Given** a Pro user, **when** they hit the A/B endpoint with a URL, **then** they receive two distinct OG images deterministically generated from a seed.
- [ ] **Given** an Agency user, **when** they POST to `/api/v1/og` with their key + URL, **then** they get a PNG (or signed URL) within 5s.

### Account / Billing

- [ ] **Given** a new visitor, **when** they sign up, **then** they have a free account with both tools usable up to free limits.
- [ ] **Given** a free user, **when** they click upgrade and complete Stripe Checkout, **then** within 60s their account is Pro and free limits are removed.
- [ ] **Given** Pro/Agency users, **when** they cancel via Stripe portal, **then** at period end they revert to free.
- [ ] **Given** a visitor during launch week, **when** they purchase LTD ($99), **then** their account is permanently flagged Pro and the LTD counter decrements.
- [ ] **Given** the LTD counter is at 100, **when** another visitor tries to buy LTD, **then** the LTD purchase page returns 410 and recommends Pro monthly.

### Brand / Domain

- [ ] **Given** `TAGSMITH_BASE_URL=https://tagsmith.io`, **when** any user generates an OG embed URL, **then** the returned URL uses `tagsmith.io` as the host.
- [ ] **Given** the env var is changed and the app redeployed, **when** previously generated artifacts are accessed via old URLs, **then** they 301 to the new domain (or document the migration policy if redirects aren't shipped v1).

## 8. Out of Scope (v1, explicit)

The following are explicitly **NOT** in v1 to preserve the 14-day ship:

- ❌ Annual billing or annual discount (monthly only)
- ❌ Team accounts / seat-based pricing (single-user accounts only)
- ❌ Custom domain hosting for Pro tier (Agency-only feature; Pro uses `{TAGSMITH_BASE_URL}/og/...`)
- ❌ More than 10 schema types (no Course, JobPosting, MedicalEntity, BookSeries, etc.)
- ❌ More than 3 OG templates
- ❌ Video OG image (animated/MP4)
- ❌ A/B test analytics dashboard for OG variants (the endpoint returns variants; tracking is user's responsibility v1)
- ❌ Real Google Rich Results API integration (heuristic only; deferred to v2 if API access secured)
- ❌ Markdown-input mode (URL-only v1)
- ❌ Browser extension (Chrome Web Store deferred to v2)
- ❌ Figma plugin
- ❌ Webflow / Notion / Ghost native integration apps (manual paste only v1)
- ❌ Sitemap-aware bulk schema generation for Pro tier (Agency only)
- ❌ Webhook outputs ("notify my Slack on schema break")
- ❌ User-facing AI prompt customization
- ❌ Free trial of Pro (free tier IS the trial; no time-limited Pro)
- ❌ Affiliate / referral program
- ❌ Public roadmap / changelog UI (use a static page or off-platform v1)
- ❌ Two-factor auth (defer to v2; password + email only)
- ❌ SOC 2 / ISO compliance work
- ❌ Self-hosted / on-prem option
- ❌ Languages beyond EN + PT-BR + ES (no FR/DE/IT/JA/ZH v1)

## 9. Go-to-Market (synthesis)

Full plan: `_distribution-plan.md`. Distribution discipline > build discipline. Solo bandwidth caps active channels at 4.

### Active channels (in priority)

1. **Programmatic SEO** (own site) — primary compound channel; 50+ landing pages × 3 locales = 150 organic entry points
2. **AppSumo LTD** (week 4 launch) — $99 × 100 cap = $10k seed cash + reviews + word-of-mouth
3. **Launch trio** (week 4) — coordinated Product Hunt + Show HN + IndieHackers same week
4. **Build-in-public** (weeks 0-12) — daily Twitter/LinkedIn posts drive pre-launch waitlist + post-launch trust

### Skipped channels v1

Cold email, paid ads, YouTube, affiliate, marketplace listings (AWS/Shopify/Slack/Salesforce), Chrome extension, WordPress plugin. Each evaluated and rejected for v1 — see distribution plan for rationale.

### GTM-driven product requirements (folded into v1 scope)

These channel bets impose product requirements; v1 must ship them:

- **Schema-first homepage hierarchy** — `/` hero leads with Schema gen demo and primary CTA. OG + AEO appear as secondary cards below the fold. Never give OG or AEO equal headline weight on `/`. AEO occupies the secondary hero slot ("Plus track if AI cites your brand — nobody else does") to claim the category.
- **Public per-locale, per-schema-type SEO landing pages** — template-driven, shared layout. Required for programmatic SEO to compound. Schema pages outnumber OG pages ≥3:1 in v1; AEO has 1 dedicated moat page.
- **Bundle-pricing copy on every pricing surface** — pricing page, upgrade modals, and homepage all surface the line *"Schema gen + OG + AEO at $19/mo. Pictify alone is $39."* Bundle math is the conversion wedge.
- **Email waitlist capture** during build phase (weeks 1-3); Convex form + Resend (or equivalent) email list. Ship by end of week 1.
- **Share-back attribution in free-tier output** — `<!-- generated by Tagsmith - {TAGSMITH_BASE_URL}/?ref=schema -->` on free schema output drives backlinks. Pro tier removes.
- **AppSumo coupon redemption flow** — LTD code accepts both native LTD purchase and AppSumo coupon codes. ~1 day work.
- **Press kit / about page** — required for HN and Product Hunt submissions.
- **Anonymous-use counter on free tier** — count usage from non-signed-up visits, prompt "you've used 4 of 5 — sign up for 1 more" → drives signup conversion.

### Phase milestones

| Phase | Window | Channels active | KPI gate |
|-------|--------|-----------------|----------|
| 0 | Week 0 | Build-in-public + AppSumo application | Domain locked, handles reserved |
| 1 | Weeks 1-3 | Build-in-public + waitlist | 200 followers, 100 waitlist emails |
| 2 | Week 4 | Launch trio + AppSumo LTD live | 30-50 LTDs sold, 200-500 free signups |
| 3 | Weeks 5-12 | SEO compound + content | 30+ pages indexed, 1k visits/mo by week 12 |
| 4 | Months 4-6 | SEO + WordPress plugin v2 + Chrome ext + Agency outreach | $5-10k MRR |

### Risk gates

- MRR < $1k by week 8 → SEO too slow; test paid Twitter ads ($200/wk)
- MRR < $3k by week 12 → revisit channel mix; cold-email Agency tier moves up
- Product breaks in prod during distribution → distribution stops; reliability is GTM gate
- LTD cap unhit by week 8 → second wave at $149 (AppSumo allows)

## 10. Codebase Pivot & Reuse Manifest

Tagsmith pivots from existing `airio` codebase (Convex + Next.js + Dodo Payments). Full plan: `_pivot-plan.md`.

### Decisions

| # | Decision |
|---|----------|
| Repo | `git mv apps/airio apps/tagsmith` (in-place rename, preserve history) |
| Convex | Fresh deployment (no migration baggage) |
| Test data | Wipe (Carlos = sole test user) |
| Domain | Env-driven via `TAGSMITH_BASE_URL` + `NEXT_PUBLIC_DASHBOARD_URL`. No hardcoded host strings anywhere. |
| Locales | EN primary; PT-BR + ES at launch |

### What ships from airio (refactor + extend)

- Auth (Convex Auth) — keep
- Billing (Dodo Payments) — keep, swap product IDs to Pro $19, Agency $49, LTD $99
- Sites + monitoring + sharable reports + usage logs + crons + http — keep
- `audits.ts` pipeline → refactored as schema generator
- `visibilityReports` + `promptBaskets` + `visibilitySnapshots` → repositioned as **Tool 3: AEO Citation Tracker** (no new code; rename + reposition UI)
- Pre-launch auth bug backlog (AUTH-001, AUTH-002 in airio TODOS.md) — fixed in week 1 before any new feature work

### What gets borrowed from getmd-design (port pattern)

- `convex/apiKeys.ts` → Agency tier API key auth
- `convex/extractions.ts` (Browserless integration) → URL fetching for both Schema and OG tools
- `ecosystem.config.js` + `deploy.sh` → production PM2 deploy
- WordPress plugin scaffold + VS Code extension scaffold → defer to v2 (months 4-6 channel expansion)

### Tool 3 added to v1 scope: AEO Citation Tracker

(Already built in airio; rename only — no new code.)

- **Free tier**: paste URL + brand → tool auto-generates 3 prompts → checks Gemini + ChatGPT — 1 check/week
- **Pro tier**: auto-generates up to 10 prompts × 4 LLMs (Gemini, ChatGPT, Claude, Perplexity), daily tracking, alerts on first appearance/disappearance + position deltas, 5-site monitor (shared with Schema)
- **Agency tier**: 50-site monitor, competitor benchmarking, white-label, API endpoint
- **Acceptance**: Pro user can add a brand + URL → tool auto-generates prompts → daily 4-engine check runs → email alert when brand citation status or position changes

### Out of scope (still v1)

- WordPress plugin / VS Code extension (defer to month 4-6 channel work)
- llms.txt / robots.txt audit (airio's existing AEO output, deferred to v2 audit tool)
- AI excerpt rewriter (deferred)
- BRL pricing — USD only v1 (Stripe/Dodo handle VAT)

### Net build impact

3-tool launch instead of 2-tool. Week 1 = rebrand + cleanup + foundation. Weeks 2-4 per `_distribution-plan.md` Phase 2-3. Estimated 5-7 days saved vs greenfield.

## 11. v1 ship gate

Tagsmith v1 is "shippable" when **all** acceptance criteria above pass on staging, AND:

- A free user can complete the full job (URL → JSON-LD copy + URL → OG download) without signing up
- A Pro user can pay $19, get unlimited use, and cancel cleanly
- LTD purchase flow works and counter decrements
- One marketing page per tool (`/schema-markup-generator`, `/og-image-generator`) ranks for at least one indexed long-tail keyword by week 6 post-launch
- Convex + Next.js deployed; `TAGSMITH_BASE_URL` env-driven and verified by changing it on staging
