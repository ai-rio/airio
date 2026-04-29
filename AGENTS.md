# Airio - AI-Powered SEO Audit Tool

This project uses [Convex](https://convex.dev) as its backend for AI-powered SEO audits where users submit URLs to get audit scores and AI-generated fixes.

## Hard Rules (Non-negotiable - Always Follow)

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them all - don't pick silently.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If solution could be 50 lines but you wrote 200, rewrite it.
- Ask: "Would a senior engineer say this is overcomplicated?"

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style.
- If you notice unrelated dead code, mention it - don't delete it.
- Remove only imports/variables/functions that YOUR changes made unused.
- Every changed line should trace directly to the user's request.

### 4. Destructive Command Protection
**Always confirm before running irreversible operations.**
- Ask for permission before force pushing, resetting HEAD, merging branches, or running remove with force.
- If unsure whether a command is destructive, ask instead of assuming.

### 5. Goal-Driven Execution & Verification
**Define success criteria. Loop until verified.**
- Transform tasks into verifiable goals:
  - "Add validation" → "Write tests for invalid inputs, then make them pass"
  - "Fix the bug" → "Write a test that reproduces it, then make it pass"
  - "Refactor X" → "Ensure tests pass before and after"
- For multi-step tasks, state brief plan with verification steps.
- Verify not only that features exist but that they function correctly as intended.
- Use all available verification mechanisms (unit tests, linting, type checks).
- After implementing fixes from user feedback, add learnings to a dedicated file.

## Project Information

### Repo Structure
- `site/` — marketing LP at ai.rio.br (Next.js, port 3003)
- `dashboard/` — app at seo.ai.rio.br (Next.js, port 3002)
- `convex/` — backend (DB, auth, actions, billing)

### Commands
```bash
# Backend
npx convex dev

# Dashboard
cd dashboard && bun run dev   # :3002

# Site
cd site && bun run dev        # :3003
```

### Stack
- Convex — DB + serverless functions + auth
- @convex-dev/auth + Resend — magic link email auth
- DodoPayments — credit packs (10/30/100 audits)
- Anthropic Claude API — AEO analysis + fix generation
- fetch — crawl robots.txt, llms.txt, HTML pages
- Next.js 15 + Tailwind 4

### Key Flows

#### Audit flow
1. User submits URL → `actions/audit.ts:runAudit`
2. `lib/crawler.ts:crawlSite` — fetches robots.txt, llms.txt, homepage HTML
3. `lib/aeoAnalyzer.ts:runAeoAnalysis` — Claude generates score + fixes
4. Result stored in `audits` table, credit deducted
5. Dashboard shows score + download buttons for generated files

#### Credit flow
- Free tier: 1 audit/month per user
- Paid: buy packs via DodoPayments checkout
- `users.ts:checkAndConsumeUsage` gates every audit

### Convex Action Pattern
All external API calls use `'use node'` actions. Copy the pattern from `convex/actions/audit.ts`:
- validateUrl (SSRF protection)
- auth check
- rate limit
- usage gate
- createPending → run work → markComplete/markFailed

### Environment Variables
See `.env.local.example` for required vars.
Set `AUTH_EMAIL_MOCK=1` in dev to skip sending real emails.

<!-- convex-ai-start -->
When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.
Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Maintenance
Keep this file focused and under 300 lines for optimal agent performance. Iterate on and improve it over time as we learn what works best for this project.

## Rule Files
For detailed, domain-specific rules, see the files in `.agents/rules/`:
- `.agents/rules/convex-action-pattern.md` - Convex action pattern requirements
- `.agents/rules/ai-output-handling.md` - Handling AI-generated content safely
- `.agents/rules/credit-billing-integrity.md` - Credit and billing accuracy requirements
- `.agents/rules/seo-aeo-validation.md` - Validating SEO/AEO outputs
- `.agents/rules/observability.md` - Logging, monitoring, and alerting requirements

You need to mention the location of these files in claude.md so Claude knows they exist. For example, if you want Claude to follow certain specific instructions when writing APIs, you can add those in a rule file for them so that when Claude is working on them, it can load those instructions and use them directly.