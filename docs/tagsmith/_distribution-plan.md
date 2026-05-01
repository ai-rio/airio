# Tagsmith — Distribution Plan

Distribution > build difficulty. Solo founder bandwidth: max 3-4 active channels in parallel.

## Channel Mix Verdict

### Active channels (build supports + sequence)

| Rank | Channel | Why | Cost | Effort |
|------|---------|-----|------|--------|
| 1 | **Programmatic SEO** (own site) | 50+ landing pages × 3 locales = 150 organic entry points; tagsmith IS an SEO tool, must rank for SEO terms | $0 + Haiku content gen | High week 4-12 |
| 2 | **AppSumo Lifetime Deal** (week 4 launch) | $99 LTD seeds 100 founding users + $10k cash + reviews + word-of-mouth at launch | 30% rev share | Medium week 3-5 |
| 3 | **Product Hunt + IndieHackers + HN** (week 4 coordinated launch) | Indie SaaS persona lives there; Show HN with AI-auto-detect angle is HN-friendly | $0 | Medium week 4 |
| 4 | **Twitter/X + LinkedIn build-in-public** | Build trust + audience pre-launch; SEO consultants live on LinkedIn | $0 | Low daily |

### Active channels addendum: free `npx tagsmith` CLI (v1, week 4)

Ship MIT-licensed CLI on npm at launch. Static-first extraction only, no API key. Adds 5th channel:

- npm install count = SEO trust signal
- GitHub stars = social proof
- "Show HN: I built a free schema markup CLI" = HN launch angle
- Free users convert to hosted SaaS for AI auto-detect, multi-site monitor, OG, citation tracker
- Reuses same parser module as Convex action — minimal extra build cost (1 day scaffolding)

### Deferred channels (after $10k MRR or v2)

| Channel | Why deferred |
|---------|-------------|
| Chrome Web Store extension | v2 — built-in browser tool ("Tagsmith for any URL"); strong distribution but +2 weeks build |
| Shopify App Store | strong, but Shopify owners are mostly served by Schema Plus; better fit when v2 adds e-commerce schema deep |
| WordPress.org plugin | bridges Yoast/RankMath gap; +3 weeks build; competing on their turf |
| AWS/Azure/GCP Marketplace | wrong customer profile (enterprise procurement); revisit at $50k MRR with Agency tier |
| Slack/Zoom/Salesforce AppExchange | wrong product type for v1 (not collab/CRM) |
| Figma/Canva community | weak fit (not design tool primary) |
| Cold email | low ROI vs SEO for self-serve $19 product; revisit for Agency tier outreach |
| Paid ads (Google/Meta) | premature pre-PMF; SEO is the bet |
| Reddit | low conversion vs effort; r/SEO + r/indiehackers OK as launch echo, not primary |
| Directory submissions (Taaft, ToolsForHumans, etc.) | nice-to-have, do once batched in week 5; not channel |

### Hard skips

- Affiliate program v1
- Influencer marketing
- YouTube content (production cost too high solo)
- Podcast tour pre-launch (no story yet)

---

## Week-by-Week Sequencing

### Phase 0 — Pre-build (week 0, before code)

| Day | Action | Output |
|-----|--------|--------|
| 0 | Lock domain (tagsmith.com or .io) | env-driven config in PRD |
| 0 | Set up @tagsmith handles: Twitter/X, LinkedIn, GitHub, IndieHackers | Reserve names |
| 0 | Build-in-public commit: "Day 0: starting Tagsmith" | First Twitter post |
| 0 | Apply to AppSumo Sumo-ling program | Pending review while building |

Goal: zero ad-spend, set audience seed before code starts.

### Phase 1 — Build (weeks 1-3)

Daily: 1 build-in-public tweet/post (15 min). Don't over-engineer marketing. Just ship.

| Week | Channel actions | Goal |
|------|-----------------|------|
| 1 | Twitter/LinkedIn: "Day 3: schema generator working" + screenshot. AppSumo: keep submission moving | 50 Twitter followers |
| 2 | Twitter/LinkedIn daily. IndieHackers profile filled out + first milestone post | 100 Twitter, IH bio active |
| 3 | Twitter/LinkedIn daily + first long-form post: "Why I'm building Tagsmith". Pre-launch landing page live + email waitlist (Convex form) | 200 followers, 100 waitlist emails |

### Phase 2 — Launch (week 4, the big push)

**Single coordinated launch day** — spread effort across 3 platforms same week, not 3 separate launches.

| Day | Action |
|-----|--------|
| Mon | Tuesday Product Hunt launch teed up (PH launches at midnight PT) |
| Tue | **PH launch + Show HN ("Tagsmith — AI-auto schema markup from any URL") + IndieHackers milestone post + Twitter thread** |
| Tue | Email waitlist (100+ emails) at 9am ET with LTD link |
| Wed | AppSumo LTD live; pin everywhere; reply to every comment on PH/HN/IH |
| Thu | First customer-success tweet thread |
| Fri | Recap post: launch numbers, lessons, invite to LTD (urgency: 100 cap) |

**Goals week 4**:
- PH: top-10 of day (badge) → 1k+ visits
- HN: front page top 30 (no need for #1) → 3-10k visits
- IH: top milestone → 500 visits
- LTD: 30-50 of 100 sold (~$3-5k cash)
- Email signups: 500
- Free signups: 200
- Pro conversions: 8-15 ($150-285 MRR seed)

### Phase 3 — SEO compound (weeks 5-12)

Switch from launch mode to compound mode. SEO landing pages are the long game.

| Week | Action | Goal |
|------|--------|------|
| 5 | Ship 10 schema-type landing pages (EN): "JSON-LD generator for [Article/Product/FAQ/...]" | 10 pages indexed |
| 6 | Translate to PT-BR + ES: 30 pages total | 30 pages indexed |
| 7 | "Best [X] alternative" listicles (5 posts: Yoast alt, RankMath alt, Schema App alt, SchemaWriter alt, Bannerbear alt) — Schema-weighted 4:1 vs OG | 5 comparison pages |
| 8 | Tutorial content: "How to add schema to Notion/Webflow/Ghost/Substack/Astro" (5 posts × 3 locales = 15 pages) | 15 tutorials |
| 9 | First backlink push: post tutorials on dev.to + Hashnode + Medium (republish strategy with canonical to tagsmith.com) | 15 backlinks acquired |
| 10 | Outreach: SEO Twitter accounts. Free tool review angle. 20 messages | 3-5 reviews/mentions |
| 11 | First IH/Twitter customer case study: "How [user] added schema to 50 pages in 1 hour with Tagsmith" | 1 published case study |
| 12 | Audit GA + Search Console. Double down on top-3 ranking pages with longer content. Drop any zero-traffic pages. | $1.5-3k MRR baseline |

### Phase 4 — Compound (months 4-6)

- Content velocity: 4 SEO posts/wk (12-15/mo across locales)
- AppSumo Plus / second LTD wave at $149 if first 100 sold out (Sumo allows it)
- WordPress plugin starts (v2 channel unlock — bridge to Yoast/RankMath users who want Tagsmith's AI auto-detect inside WP)
- Chrome extension v2 build (browser tool = passive distribution)
- First Agency tier landing page + cold-email playbook to 100 SEO agencies

**Target month 6**: $5-10k MRR.

---

## Per-Channel Goals (measurable)

### Programmatic SEO (primary channel)

- Week 8: 30+ pages indexed across EN/PT-BR/ES
- Month 3: 1,000 organic visits/mo
- Month 6: 5,000 organic visits/mo
- Month 12: 25,000 organic visits/mo
- Top-3 keyword targets to win by month 12 (Schema-weighted, 2 Schema + 1 OG): "schema markup generator AI", "JSON-LD generator from URL", "OG image from URL". PT-BR + ES equivalents.
- Secondary Schema targets month 6-12: "faq schema generator" (Jasper #2 = AI angle proven), "webpage schema generator" (SchemaWriter #5 = beatable AI competitor), "product schema generator", "how to add schema to [Notion/Webflow/Ghost]"
- AEO moat page: rank for "ai visibility tracker", "chatgpt brand monitoring", "perplexity citation tracker", "como aparecer no chatgpt" — low vol, zero incumbents, highest CPC
- Skip: "og image generator" head-on (Vercel #1 dev tool, OpenGraph.xyz #2 freemium); compete via long-tail "og image from url no code" + bundle CTAs from Schema pages

### AppSumo LTD (one-time launch)

- Week 4-5: 100 LTDs sold = $9.9k cash, 30% to Sumo = $6.93k net
- Reviews: 50+ verified reviews on AppSumo listing
- Long-tail: AppSumo SEO ranks "Tagsmith review" for ~12 months

### Launch trio (PH + HN + IH, week 4)

- Combined visits: 5-15k week 4
- Free signups: 200-500
- LTD conversions from launch: 30-50

### Build-in-public Twitter/LinkedIn

- Pre-launch: 200-500 followers across platforms
- Month 3: 1,000 followers
- Month 6: 2,500 followers
- Conversion lift: 5-15% of monthly free signups should attribute to Twitter/LinkedIn referral

---

## What This Plan Demands of the Product (PRD impact)

These channels shape the product. Add to PRD v1:

1. **Schema-first homepage hierarchy** — `/` hero leads with Schema gen demo. OG + AEO secondary. AEO holds secondary hero slot to claim category. Never equal headline weight to OG.
2. **Public landing page system** — programmatic SEO requires per-locale, per-schema-type pages with shared template. Schema pages outnumber OG ≥3:1 in v1; 1 AEO moat page. (Lock as v1 requirement)
3. **Bundle-pricing copy** on every pricing surface: *"Schema gen + OG + AEO at $19/mo. Pictify alone is $39."*
4. **Email waitlist capture pre-launch** — Convex form + email list (Resend or similar) — 1 day work, must be week 1
5. **Share-back mechanic in free output** — `<!-- generated by Tagsmith - tagsmith.com/?ref=schema -->` on free schema output drives organic backlinks
6. **AppSumo LTD compatibility** — LTD code redemption flow must accept AppSumo coupon codes (1 day work)
7. **Public roadmap page** — IH/Twitter audience expects it; static markdown rendered page is fine
8. **Press kit / about page** — required for HN/PH submissions
9. **Anonymous usage tracking on free tier** — count usage from non-signed-up visits, convert to "you've used 4 of 5 — sign up for 1 more" upgrade prompt (drives signups + conversions)

Items 1, 2, 4, 6, 8 are ship-blocking for launch; 3, 5, 7, 9 are conversion accelerators added during weeks 1-3.

---

## What to Skip (locked decisions)

- ❌ Cold email v1 — wrong channel for $19 self-serve
- ❌ Paid Google/Meta ads pre-PMF
- ❌ YouTube — solo bandwidth wrong
- ❌ Affiliate v1 — adds complexity, defer to month 6
- ❌ Reddit primary — tangential reach only (post launch echo OK)
- ❌ Multiple LTD waves week 4 — one wave, one cap, scarcity drives urgency
- ❌ Influencer/sponsored content — pre-PMF waste
- ❌ Marketplaces (AWS/Shopify/Slack/Salesforce) — wrong fit for v1 product/persona
- ❌ Localization beyond EN/PT-BR/ES v1

---

## Risk-flag: solo bandwidth realism

This plan demands ~30 hrs/wk distribution effort weeks 4-12 on top of build/support. Realistic checks:

- If MRR < $1k by week 8 → SEO compound is too slow → consider paid Twitter ads test ($200/wk to 3 audiences)
- If MRR < $3k by week 12 → revisit channel mix; cold-email Agency tier outreach moves up
- If AppSumo cap not hit by week 8 → second wave at $149 OK
- If product breaks in production while you're doing distribution → distribution stops; product reliability is GTM gate

The plan only works if v1 ships clean week 4. Build PRD scope discipline matters more than channel count.
