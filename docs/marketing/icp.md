# Tagsmith — Ideal Customer Profile (ICP)

> ⚠️ **Pre-launch:** All personas and criteria are assumptions. Validate after first 20 customers. Label findings as `[VALIDATED]` or `[INVALIDATED]` inline.
>
> 💱 **Pricing convention:** All prices in **USD canonical**. Currency localization (BRL, EUR, etc.) is a **render-time concern** handled by `Intl.NumberFormat` + per-locale Dodo Price objects. **Locale ≠ ICP attribute** — it's a distribution variable. See `docs/tagsmith/_distribution-plan.md` for go-to-market locale sequencing.

---

## Executive Summary

Tagsmith serves three buyer profiles, all converging on the same trigger: **AI search engines (ChatGPT, Perplexity, Claude, Gemini) are now answering questions buyers used to ask Google — and brands that aren't cited in those answers lose revenue.** The three personas differ in scale, sophistication, and willingness-to-pay, not in the underlying problem.

| Persona | Primary Tool | Plan | Trigger |
|---------|--------------|------|---------|
| **Prompt Optimizer** (SMB / freelancer) | Schema gen + AEO check | Free → Pro $19/mo | "My competitor is in ChatGPT, I'm not." |
| **Brand Guardian** (CMO / Head of Growth) | AEO monitoring + alerts | Pro $19/mo → Agency $49/mo | "We lost organic traffic to AI search; we have no KPI for AI presence." |
| **Performance Agency** (resale / white-label) | All three tools across client portfolio | Agency $49/mo → LTD $99 | "Clients are asking about AEO and we have nothing to sell." |

---

## 🎯 ICP 1: The "Prompt Optimizer"

### Persona snapshot
**Role:** Marketing Coordinator · SEO Specialist · Founder · Freelance SEO consultant
**Company:** SMB / e-commerce / local SaaS / service business · ≤50 employees
**Digital maturity:** Medium — invested in traditional SEO, never optimized for AI

### Pain points
| Pain | Severity | Frequency | Current workaround |
|------|----------|-----------|---------------------|
| Drop in organic traffic, doesn't know how to adapt | 8/10 | Daily anxiety | Reads SEO blogs; tries random tweaks |
| Sees competitors cited in ChatGPT, brand absent | 9/10 | Weekly checks | None — visible without monitoring |
| Can't afford agency retainer for AEO consulting | 7/10 | Monthly budget review | DIY with free tools, mostly Schema.org docs |
| No technical authority to implement complex fixes | 6/10 | Per-task | Asks developer or skips fix |

### Goals
**Primary:** Get a fast diagnosis with a prioritized fix list. **Metric:** AEO score visible. **Timeframe:** under 30 seconds.
**Secondary:** Show progress to boss/client. Implement fixes without a developer. Re-check periodically.
**Dream outcome:** Brand cited in ChatGPT for category queries within 60 days of fixes.

**JTBD:** *"When I search my category in ChatGPT and see competitors cited but my brand absent, I want a fast technical diagnosis and a ready-to-paste fix, so I can prove to my boss the site is optimized for AI search."*

### Why Tagsmith
- **URL-paste workflow** — no SDK, no developer, no setup
- **Three tools, one price** — schema + OG + AEO bundled at the price of one specialist tool ($19/mo Pro vs Pictify alone at $39/mo)
- **CMS-agnostic output** — paste-ready snippets for WordPress, Webflow, Shopify, generic HTML
- **Free tier** — 5 schema · 10 OG · 1 AEO brand · weekly check, no card required

### Situational triggers
- Just saw a competitor cited in ChatGPT for a query they expected to win
- Boss/client asked "how do we appear in AI?" with no answer ready
- Quarterly SEO report due, needs a new metric to show
- Lost a deal to a competitor whose name "the AI just gave"

### Qualifying criteria
- **Must-have:** Existing site with prior SEO investment · aware of AI search · can approve $20-50 purchase independently
- **Nice-to-have:** Uses WordPress / Webflow / Shopify · has a reporting cadence
- **Disqualifying:** Pre-launch site (nothing to audit) · expects instant ranking boost · seeking full-service agency retainer

### Objections + responses
| Objection | Response |
|-----------|----------|
| "I already use Schema App / RankMath" | "Those are schema-only. Tagsmith bundles schema + OG + AEO at half the price." |
| "$19/mo is one more SaaS subscription" | "Free tier covers your first 5 schema gens + 10 OG renders + 1 AEO brand — confirm value before paying." |
| "I don't trust AI-generated schema" | "Static-first parser handles 70% of pages without LLM. Validation against schema.org spec runs locally." |
| "Will this work on [my CMS]?" | "Paste any URL. Output is paste-ready JSON-LD + OG image — works on any CMS." |

### Channel mapping
| Channel | Relevance | Content type |
|---------|-----------|--------------|
| Google Search (long-tail) | 5/5 | "JSON-LD generator from URL", "schema markup AI", "OG image generator" |
| YouTube tutorials | 4/5 | 2-minute paste-URL demos |
| SEO communities (Reddit r/SEO, r/bigseo, FB groups) | 4/5 | Free-tool drops, audit threads |
| Twitter/X | 3/5 | Before/after AEO citation screenshots |
| Newsletters (Search Engine Land, Marketing Brew) | 3/5 | Sponsorships |

**Top 3 channels:** Google Search → YouTube → SEO communities.

### Messaging
- ✅ Do say: "See exactly what's blocking you from appearing in ChatGPT" · "Paste-ready files, no developer needed" · "Score you can show your boss today"
- ❌ Don't say: "Long-term content strategy" · "monthly retainer" · "statistical confidence interval"

---

## 🎯 ICP 2: The "Brand Guardian"

### Persona snapshot
**Role:** Head of Digital Marketing · CMO · Head of Growth · SEO Manager
**Company:** Mid-market to enterprise · 50–500+ employees · B2B SaaS, marketplace, fintech, large retailer, content portal
**Digital maturity:** High — structured SEO team, uses Semrush, Ahrefs, GSC, BigQuery

### Pain points
| Pain | Severity | Frequency | Current workaround |
|------|----------|-----------|---------------------|
| Traditional search traffic migrating to zero-click AI answers | 9/10 | Daily dashboard check | Manual ChatGPT queries |
| No reliable tool measures brand presence in AI engines | 9/10 | Weekly leadership review | Spreadsheet + manual checks |
| When cited, brand may be incorrect, outdated, or paired with competitor | 8/10 | Monthly reputation review | Reactive corrections |
| CMO asks "are we gaining or losing AI share?" — no data to answer | 10/10 | Monthly board prep | Hand-waving |
| Justify content + technical SEO budget for AI era | 7/10 | Quarterly planning | Anecdotes |

### Goals
**Primary:** Reliable AI presence KPI (citation rate × position) tracked weekly. **Metric:** PSOS (Position Share of Surface) per LLM. **Timeframe:** baseline within 2 weeks.
**Secondary:** Drop alerts in hours. Correlate content changes to citation changes. Defensible budget justification.
**Dream outcome:** "After we shipped FAQ schema and three pillar pages, our PSOS rose 22% across all four LLMs."

**JTBD:** *"When my CMO asks whether we're gaining or losing share in AI search and nobody has data, I want a reliable weekly citation KPI with drop alerts, so I can quantify AI visibility and defend our content investments."*

### Why Tagsmith
- **AEO citation tracker across 4 LLMs** (ChatGPT + Perplexity in Free, +Claude +Gemini in Pro) with weekly → daily cadence
- **Drop alerts within hours** of citation status change — not weeks
- **Failure diagnosis** — when citation drops, suggests technical issues to audit (often schema-related; schema gen tool is in the same product)
- **Position deltas + competitor tracking** — moving up vs down vs which competitor

### Situational triggers
- Quarterly board meeting asks for "AI search readiness" status
- Sustained organic traffic decline that channel mix can't explain
- Competitor wins a placement in ChatGPT for a head term
- New CEO/CMO arrives, demands AI strategy
- Industry report flags AI Overviews adoption inflection

### Qualifying criteria
- **Must-have:** Organic traffic is a primary lead-gen channel · internal team or agency managing SEO continuously · budget authority for $50-250/mo SaaS
- **Nice-to-have:** Already uses Semrush/Ahrefs · measurable traffic decline in past 12 months · AI search question raised at exec level
- **Disqualifying:** No existing SEO investment · <10 employees · seeking one-time audit only · no recurring reporting cadence

### Objections + responses
| Objection | Response |
|-----------|----------|
| "$19/mo looks too cheap to be enterprise-credible" | "Pro is for individual operators. Agency tier ($49/mo) adds 50-site monitoring, white-label reports, API." |
| "We need API access for our internal dashboards" | "Agency tier includes REST API for citation data, schema validation, OG generation." |
| "How is this different from a generic rank tracker?" | "Rank trackers measure SERP position. Tagsmith measures whether the LLM cites you — different surface, different metric." |
| "We can't depend on a 5-person startup" | "Built on Convex (Anthropic-grade infra), Anthropic + OpenAI + Perplexity APIs. Output is paste-ready JSON-LD that works without us if we shut down." |

### Channel mapping
| Channel | Relevance | Content type |
|---------|-----------|--------------|
| LinkedIn (CMO/Growth) | 5/5 | Case studies, AEO thought leadership |
| Search Engine Land / Marketing Brew | 4/5 | Sponsored briefings, guest posts |
| Industry conferences (BrightonSEO, SaaStr, MozCon) | 4/5 | Speaking slots, demo booths |
| Twitter/X (SEO leaders) | 3/5 | Authoritative threads with data |
| YouTube long-form | 3/5 | "How [brand] tracks AEO" interviews |

**Top 3 channels:** LinkedIn → industry press → conferences.

### Messaging
- ✅ Do say: "Reliable PSOS KPI for board reporting" · "Know before revenue feels it" · "Correlate content actions to AI visibility gains"
- ❌ Don't say: "Quick fix" · "one-time audit" · "easy setup" · anything that signals lack of rigor

---

## 🎯 ICP 3: The "Performance Agency"

### Persona snapshot
**Role:** Agency Partner / Director · SEO Head · Growth Partner
**Company:** Digital marketing agency or SEO consultancy · 5–50 retainer clients · performance / inbound / branding focus
**Digital maturity:** High — Semrush, Ahrefs, Screaming Frog, Looker Studio dashboards

### Pain points
| Pain | Severity | Frequency | Current workaround |
|------|----------|-----------|---------------------|
| Clients ask "how do we appear in ChatGPT?" — no productized answer | 9/10 | Weekly client calls | Improvises a paragraph in slide deck |
| Traditional SEO services (on-page, link building) commoditizing | 8/10 | Quarterly margin review | Discounting |
| No bandwidth to build internal AI monitoring tooling | 7/10 | Constant | Stalls on AEO offering |
| Need professional reports to retain retainer | 8/10 | Monthly client reports | Manual decks |

### Goals
**Primary:** Launch a productized "AEO as a Service" offering at high margin. **Metric:** % of retainers with AEO add-on. **Timeframe:** within 30 days of signup.
**Secondary:** White-label reports. Centralized monitoring across client portfolio. Defensible pricing premium.
**Dream outcome:** "AEO add-on doubles our retainer LTV and clients renew 3 quarters in advance."

**JTBD:** *"When a client asks how to appear in ChatGPT and I have no ready answer, I want a white-label AEO tool I can brand and resell, so I can charge a premium retainer add-on and retain the client for another 12 months."*

### Why Tagsmith
- **Agency tier ($49/mo) — 50 sites monitored, REST API, white-label OG (own domain)** — costs ~$1/site/mo, agency charges client $50-200/site/mo
- **Shareable audit reports** — public link looks like agency deliverable, not third-party SaaS
- **Dual offering** — credits for initial audit + monitoring for retention. Same product, two billing motions
- **LTD option ($99 × 100-cap, founder pricing)** — buy once, resell forever, never hit a vendor pricing increase

### Situational triggers
- Large client mentions AEO at QBR, agency has no answer
- Competing agency lands a deal pitching "AI visibility services"
- New agency partner pushes productization
- Margin compression in traditional SEO services
- AppSumo / lifetime-deal newsletter drops Tagsmith LTD

### Qualifying criteria
- **Must-have:** Active retainer book with 5+ clients · clients asking about AEO/AI search · budget authority for $50-100/mo tooling without procurement delay
- **Nice-to-have:** Already uses Semrush / Screaming Frog / Looker · QBR cadence · history of upselling new SEO services
- **Disqualifying:** Solo freelancer with 1-2 clients · project-based (no retainers) · building own in-house tool · purely link-building focused

### Objections + responses
| Objection | Response |
|-----------|----------|
| "We need full white-label, not 'powered by'" | "Agency tier ships with white-label OG (own domain via CNAME). Schema + AEO white-label on roadmap." |
| "Our clients sign 12-month contracts; we need stable pricing" | "LTD ($99) locks lifetime Pro pricing. Or annual Agency at 15% discount." |
| "We have 80 clients; 50 isn't enough" | "Agency tier scales — contact for custom limits + volume pricing." |
| "How does this fit into our Looker dashboards?" | "REST API endpoint returns citation data + schema validation + OG render URLs in JSON. Pipe into any BI tool." |

### Channel mapping
| Channel | Relevance | Content type |
|---------|-----------|--------------|
| AppSumo / LTD newsletters | 5/5 | Lifetime deal launch |
| Agency-focused communities (Indie Hackers, agency Slack groups) | 4/5 | "How we built AEO offering with Tagsmith" case studies |
| LinkedIn (agency owners) | 4/5 | Margin-compression + productization narratives |
| Niche conferences (TrafficThinkTank, Affiliate World) | 3/5 | Speaking + booth |
| Cold partnership outreach | 3/5 | Direct DM to SEO agency owners |

**Top 3 channels:** AppSumo LTD launch → LinkedIn agency content → cold partnerships.

### Messaging
- ✅ Do say: "Your agency's AEO offering, ready in days" · "$1/site/mo cost — charge clients 50-100x" · "Shareable reports that look like yours"
- ❌ Don't say: "Personal use" · "single site" · "self-serve" · anything that sounds like a personal tool vs. agency infrastructure

---

## 📊 Comparative Summary

| Profile | Main product | Plan | Revenue type | Trigger |
|---------|--------------|------|--------------|---------|
| Prompt Optimizer | Schema gen + 1-brand AEO | Free → Pro $19/mo | Subscription | "My competitor is in ChatGPT, I'm not." |
| Brand Guardian | AEO monitoring + alerts | Pro $19/mo → Agency $49/mo | Subscription | "We lost traffic to AI search; need a KPI." |
| Performance Agency | All three tools, multi-client | Agency $49/mo + LTD $99 | Subscription + LTD | "Clients asking about AEO; need a productized answer." |

---

## ❌ Out of ICP (do not target)

- **Pre-launch / no live site** — nothing to audit, no schema to generate, no brand to track
- **Companies <10 employees with no SEO investment** — wrong sophistication tier
- **Pure link-building agencies** — different problem, different buyer mental model
- **Enterprise (500+) seeking custom contract** — handled separately, not v1 ICP
- **B2C influencers** — not a brand-citation use case

---

## 🚫 What Tagsmith Does NOT Do

Per Semrush's 2025 AI Visibility Index, AI search runs in two stages:

- **Stage 1 (Discovery):** AI picks the brand shortlist from Reddit, reviews, forums, UGC, social posts.
- **Stage 2 (Authority):** AI verifies brands via official site, structured data, pricing, Wikipedia, documentation.

**Tagsmith is a Stage-2 authority tool only.** Buyers expecting Stage-1 manipulation are out of ICP.

| ❌ Tagsmith does NOT | ✅ What Tagsmith DOES instead |
|---|---|
| Generate fake reviews on G2 / Capterra / Trustpilot | Validates your existing schema so AI parses your real reviews correctly |
| Post to Reddit / Quora / forums on your behalf | Tracks whether community-driven mentions translate to citations |
| Game forums or buy upvotes | Audits whether your authority signals match the discovery signals you're earning |
| Write blog content / Wikipedia entries | Generates the JSON-LD that helps AI parse the content you already wrote |
| Manipulate sentiment | Tells you when sentiment shifts, so you can respond authentically |
| Buy backlinks | Validates that the backlinks you have are AI-readable |

**Why this matters as positioning:**
- Most AEO competitors imply Stage-1 manipulation ("get cited in ChatGPT") — sketchy and fragile
- Tagsmith promises Stage-2 only — defensible, ethical, ToS-clean
- Honest scope = trust = conversion. Buyers tired of snake-oil AEO pitches notice.

**Pair Tagsmith with separate UGC strategy** (community engagement, review collection, content marketing). Tagsmith makes that work cite-able. It does not replace it.

---

---

## 🌍 Geographic + locale notes

Locale is a **distribution variable**, not a buyer attribute. The same three personas exist in São Paulo, Mexico City, Lisbon, Barcelona, Atlanta, Mumbai, and Berlin. Tagsmith ships UI in EN + PT-BR + ES at v1 because:

1. **Founder location** — São Paulo-based ops give cheaper testing + interview access in PT-BR market
2. **Underserved market** — incumbent AEO tools (e.g., Otterly.AI) ship English-only
3. **CPC arbitrage** — PT-BR AEO keywords show high commercial intent at lower CPC than US English

Currency is rendered via `Intl.NumberFormat` per locale; canonical pricing in USD. See `docs/tagsmith/_distribution-plan.md` for sequencing of locale launches.

**Do not** bake locale into ICP attributes, pain points, or "Why Tagsmith" reasons. PT-BR / ES support is a feature, not a buyer identity.

---

## ✅ Validation plan

After first 20 customers, label each ICP claim:

- `[VALIDATED]` — confirmed by 5+ customer interviews matching the pattern
- `[INVALIDATED]` — disconfirmed by 3+ customers in disagreement
- `[UNTESTED]` — no signal yet

Run quarterly review. Update pain severity scores from CRM data. Track JTBD quote frequency from sales calls + support tickets.

**Re-survey** after every 50 new customers, after pricing changes, after major feature launches, or after entering a new geography.

---

## 📎 Source artifacts

- `docs/tagsmith/_prd-tagsmith.md` — product scope + tier definitions
- `docs/tagsmith/_pricing-rebuild.md` — Pro $19 / Agency $49 / LTD $99 × 100-cap
- `docs/tagsmith/_distribution-plan.md` — channel sequencing + locale rollout
- `docs/tagsmith/_legal-engine-tos.md` — engine ToS posture (impacts ICP2 enterprise credibility)
- Memory `project_tagsmith_aeo_engines.md` — Free=ChatGPT+Perplexity, Pro=+Claude+Gemini
