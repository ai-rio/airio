This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first**.

## Repo Structure

- `site/` — marketing LP at ai.rio.br (Next.js, port 3003)
- `dashboard/` — app at app.ai.rio.br (Next.js, port 3002)
- `convex/` — backend (DB, auth, actions, billing)

## Commands

```bash
# Backend
npx convex dev

# Dashboard
cd dashboard && bun run dev   # :3002

# Site
cd site && bun run dev        # :3003
```

## Stack

- Convex — DB + serverless functions + auth
- @convex-dev/auth + Resend — magic link email auth
- DodoPayments — credit packs (10/30/100 audits)
- Anthropic Claude API — AEO analysis + fix generation
- fetch — crawl robots.txt, llms.txt, HTML pages
- Next.js 15 + Tailwind 4

## Key Flows

### Audit flow
1. User submits URL → `actions/audit.ts:runAudit`
2. `lib/crawler.ts:crawlSite` — fetches robots.txt, llms.txt, homepage HTML
3. `lib/aeoAnalyzer.ts:runAeoAnalysis` — Claude generates score + fixes
4. Result stored in `audits` table, credit deducted
5. Dashboard shows score + download buttons for generated files

### Credit flow
- Free tier: 1 audit/month per user
- Paid: buy packs via DodoPayments checkout
- `users.ts:checkAndConsumeUsage` gates every audit

## Convex Action Pattern

All external API calls use `'use node'` actions.
Copy the pattern from `convex/actions/audit.ts`:
- validateUrl (SSRF protection)
- auth check
- rate limit
- usage gate
- createPending → run work → markComplete/markFailed

## Environment Variables

See `.env.local.example` for required vars.
Set `AUTH_EMAIL_MOCK=1` in dev to skip sending real emails.
