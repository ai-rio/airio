# AIRio

**Appear in ChatGPT. Monitor your AI presence.**

AIRio is the Brazilian **Answer Engine Optimization (AEO)** platform that helps brands be cited by artificial intelligences like ChatGPT, Gemini and Perplexity. The platform offers two distinct services — one-time audit and continuous monitoring — unified in one place.

---

## 🧩 Products

### 1. AEO Audit (Credits)
**What it is:** A technical and content analysis of your site, focused on making it citable by generative AI mechanisms.
**Business model:** One-time credit purchase.
**Delivery:** A 0–100 score, list of problems (with severity), correction files (robots.txt, llms.txt, schema JSON‑LD, optimized snippets) and specific instructions for your CMS.
**Who uses it:** Site owners, agencies and marketing professionals who want to optimize a site on a punctual basis and understand its readiness for the AI era.

**Product flow:**
1. User purchases credits in `/billing`.
2. In the **Dashboard** (`/`), adds a site and runs an audit (spends 1 credit).
3. Views the complete result in `/audit/[id]` and downloads the generated files.
4. In the site detail (`/sites/[siteId]`), tracks historical scores, problems and sets audit alerts.

---

### 2. AI Visibility Monitoring (Subscription)
**What it is:** Automated weekly monitoring that statistically measures how often your brand appears in AI search responses for real market questions.
**Business model:** Recurring subscription (monthly) per site.
**Delivery:** An unprecedented metric — **PSOS (Prompt‑Space Occupancy Score)** — with 95% confidence interval, trend graph, drop alerts and citation failure diagnosis.
**Who uses it:** Companies and agencies that depend on organic traffic and need to protect their presence in AI-generated responses over time.

**Product flow:**
1. In the **Dashboard**, the user with a monitoring plan activates monitoring for a site.
2. Defines up to 5 questions (prompts) and the brand name in `/sites/[siteId]/prompts`.
3. Every week (automatic via cron), the system queries Perplexity, records citations and generates a visibility report.
4. The user tracks everything in the **AI Visibility** tab (`/sites/[siteId]/monitoring`) and in the dedicated **Monitoring Dashboard** (`/monitoring`).
5. Receives email alerts if visibility drops below a configurable threshold.

---

## 🧠 Why Two Products?

|  | AEO Audit | AI Visibility Monitoring |
|--|----------|--------------------------|
| **Nature** | Transactional (on-demand) | Continuous (subscription) |
| **Answers question** | "Is my site ready to be cited by AI?" | "Is my brand being cited this week?" |
| **Main metric** | AEO Score (0‑100) | PSOS (0‑100%) |
| **Frequency** | When user requests | Weekly, automatic |
| **Generated assets** | Correction files, problem list | Trend graph, alerts, failure diagnosis |
| **Audience** | Point-in-time optimizers, project agencies | Brands, retention agencies, continuous SEO teams |

Both complement each other: the audit provides corrections to improve readiness; monitoring shows whether those corrections are taking effect over time and alerts when something changes.

---

## 🧱 Technical Architecture

The project is a monorepo managed with **Bun workspaces** containing:

- `convex/` – Serverless backend (Convex) with database, authentication, Node.js actions, crons and business logic.
- `dashboard/` – Next.js 15 frontend (App Router) with Tailwind CSS, authentication via Convex Auth, and shadcn/ui components.

### Services Behind the Products

| Layer | AEO Audit | AI Visibility Monitoring |
|-------|-----------|--------------------------|
| **Main action** | `actions/audit.ts` → `runAudit` | `actions/geoMonitoring.ts` → `runDueGeoChecks` / `runSiteGeoCheck` |
| **Data collection** | HTTP crawler (`lib/crawler.ts`) that reads robots.txt, llms.txt, pages and brand signals | Perplexity sampler (`lib/geo/sampler.ts`) with `n` repeated queries per prompt |
| **Processing** | Algorithmic analysis + LLM (Claude via OpenRouter) to generate score and recommendations | Brand detection (`lib/geo/brandDetection.ts`) + PSOS calculation with Wilson interval (`lib/geo/stats.ts`) |
| **Storage** | Tables `audits`, `sites` | Tables `visibilitySnapshots`, `visibilityReports`, `promptBaskets`, `citationDiagnostics` |
| **Scheduling** | Crons that run pending audits for monitored sites (`crons.ts`) | Cron that checks sites with active monitoring and executes weekly visibility check (`crons.ts`) |
| **Alerts** | `actions/alerts.ts` – score drop, new critical problems, crawler blocking | `actions/alerts.ts` – PSOS drop based on threshold |

### Directory Structure (main)

```
airio/
├── convex/
│   ├── actions/
│   │   ├── audit.ts          # AEO audit action
│   │   ├── geoMonitoring.ts  # Monitoring orchestration
│   │   ├── alerts.ts         # Alert sending (both services)
│   │   └── checkout.ts       # Credit checkout (DodoPayments)
│   ├── lib/
│   │   ├── aeo/              # AEO audit logic (prompt, score, SEO checks)
│   │   ├── geo/              # Monitoring logic (sampler, stats, brand detection)
│   │   ├── crawler.ts        # Shared crawler (used by audit)
│   │   └── rateLimit.ts
│   ├── schema.ts             # Tables clearly separated for both services
│   ├── crons.ts              # Unified scheduling
│   └── ...
├── dashboard/
│   ├── app/
│   │   ├── page.tsx (/)               # Dashboard with overview of all sites
│   │   ├── monitoring/                # Dedicated visibility dashboard (subscription)
│   │   ├── sites/[siteId]             # Site detail → Audit tab
│   │   ├── sites/[siteId]/monitoring  # AI Visibility tab (subscription)
│   │   ├── sites/[siteId]/prompts     # Prompt management (part of subscription)
│   │   ├── audit/[id]                 # Complete audit report
│   │   ├── billing                    # Credit purchase (and future monitoring plans)
│   │   └── sign-in                    # Authentication
│   ├── components/
│   │   ├── psos-gauge.tsx             # PSOS visual component
│   │   ├── psos-sparkline.tsx         # Trend sparkline
│   │   └── ...
│   └── ...
└── package.json
```

---

## 🚀 Running Locally

**Prerequisites:** Bun, Node 20+, Convex account, OpenRouter account, (optional) Perplexity account and Resend account.

```bash
# Install dependencies
bun install

# Configure environment variables
cp .env.example .env.local
# Fill in your keys

# Start in dev mode (convex + dashboard)
bun run dev
```

The dashboard will be available at `http://localhost:3002`. The Convex playground can be accessed with `npx convex dashboard`.

---

## 🔐 Required Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `CONVEX_DEPLOYMENT` | Both | Convex deployment URL |
| `OPENROUTER_API_KEY` | AEO Audit | OpenRouter API key (Claude) |
| `OPENROUTER_MODEL` | AEO Audit | Model to use (ex: `anthropic/claude-sonnet-4-5`) |
| `PERPLEXITY_API_KEY` | AI Visibility Monitoring | Perplexity API key (for sampling) |
| `AUTH_RESEND_API_KEY` | Both | Resend API key (magic links) |
| `DODO_API_KEY` | AEO Audit (credits) | DodoPayments API key (credit sales) |
| `SITE_URL` | Both | Public dashboard URL (for redirects) |
| `CRAWL_API_URL` | AEO Audit | Internal Playwright endpoint for JS rendering |
| `YOUTUBE_API_KEY` | AEO Audit | YouTube brand presence verification |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | AEO Audit | Reddit brand presence verification |

---

## 📚 Supplementary Reading

- [Convex Documentation](https://docs.convex.dev)
- [GEO: Generative Engine Optimization (Aggarwal et al., 2023)](https://arxiv.org/abs/2311.09735)
- [Quantifying Uncertainty in AI Visibility (Sielinski, 2026)](https://arxiv.org/abs/2603.08924)
- [PSOS Standard (AIVO)](https://zenodo.org/records/13772064)

---

## 📄 License

AIRio Proprietary. All rights reserved.