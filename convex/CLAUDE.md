# Convex - Tagsmith Backend

Convex backend for Tagsmith: database, auth, serverless functions (actions, mutations, queries), billing, scheduled jobs. Internal symlink alias `airio-convex` retained as legacy import path.

## Purpose
- Store and manage data: users, audits, sites, credits, etc.
- Handle authentication via @convex-dev/auth + Resend (magic link)
- Execute audit workflows: validate URL, crawl site, run AEO analysis via Anthropic Claude
- Manage credit consumption and DodoPayments integration
- Run scheduled jobs (crons) for site monitoring and alerts
- Provide real-time data to the dashboard and site apps via Convex reactive queries

## Key Files & Directories

### `schema.ts`
Defines the database schema using `defineSchema` and `defineTable`. Includes:
- `users` (extended from authTables)
- `audits` (core audit records)
- `sites` (monitored sites)
- `credits` (purchased credit packs)
- `promptBaskets`, `visibilitySnapshots`, `visibilityReports`, `citationDiagnostics` (AEO-specific)
- `shareable_reports`, `usageLogs`, `rateLimitEvents`
- Each table includes appropriate indexes for efficient querying.

### `actions/`
Contains `'use node'` functions for external API calls and side effects:
- `audit.ts`: Main audit flow (SSRF-protected URL validation, auth, rate limiting, usage gating, crawling, AEO analysis, marking audit complete/failed)
- `alerts.ts`: Likely handles sending alerts based on audit results
- `cron.ts`: Entry point for scheduled functions

### `lib/`
Helper modules used by actions:
- `crawler.js`: Fetches robots.txt, llms.txt, and homepage HTML with appropriate headers/timeouts
- `aeoAnalyzer.js`: Calls Anthropic Claude API to generate AEO score and suggested fixes
- `rateLimit.js`: Implements rate limiting (e.g., 5 requests per minute per user)
- `users.js`: Contains `checkAndConsumeUsage`, `getOrCreateUser`, etc.

### `auth.ts` & `auth.config.ts`
Configure Convex Auth with Resend provider for magic-link email authentication.

### `billing.ts`
Integrates with DodoPayments for credit pack purchases (likely creates Stripe-like checkout sessions and handles webhooks).

### `crons.ts`
Defines scheduled functions (e.g., daily site monitoring, alert checks).

### `http.ts`
May contain HTTP endpoints for webhooks (e.g., DodoPayments).

## Convex Action Pattern (Hard Rule)

All external API calls must use `'use node'` actions and follow this pattern:
1. **validateUrl** (SSRF protection) - never skip
2. **auth check** - verify user identity (or allow in dev with AUTH_EMAIL_MOCK=1)
3. **rate limit** - prevent abuse
4. **usage gate** - checkAndConsumeUsage for free tier or credit deduction
5. **createPending** → **run work** → **markComplete/markFailed**

This pattern is exemplified in `actions/audit.ts`. Always follow it for new actions.

## Writing Convex Code

### Actions (`'use node'`)
- Use for: external HTTP requests (crawling, AI APIs, payment webhooks), file system access, secrets access
- Always validate inputs with `v` schema
- Handle errors gracefully; mark audit/record as failed when appropriate
- Return minimal necessary data; avoid returning entire Convex objects if not needed
- Use `ctx.runMutation`, `ctx.runQuery`, `ctx.runAction` to call internal functions

### Mutations & Queries
- Prefer defining these in the same file as actions or in dedicated `.ts` files (not required to be in a specific folder)
- Mutations: write data; must be deterministic and fast
- Queries: read data; subscribe to changes for real-time updates in clients
- Use indexes effectively (defined in schema.ts) for query performance
- Avoid expensive operations in queries; paginate large datasets

### Scheduled Functions (Crons)
- Define in `crons.ts` or similar
- Use for: periodic site monitoring, sending alerts, cleaning up old data
- Respect rate limits of external APIs
- Log important events for observability

## Convex-Specific Guidelines

### SSRF Protection
- Always validate URLs before fetching (see `validateUrl` in audit.ts)
- Reject private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, ::1, fc00::/7, fd00::/8, 169.254.0.0/16)
- Resolve hostname to IP and check again

### Authentication
- Use `ctx.auth.getUserIdentity()` to get the current user
- In development, `AUTH_EMAIL_MOCK=1` bypasses real email sending; auth still works
- Never trust client-provided user ID; always derive from auth identity

### Rate Limiting
- Implement per-user or per-IP rate limits for expensive operations
- Use the `rateLimit` helper or similar
- Distinguish between anonymous and authenticated users if needed

### Usage & Credits
- Always gate audit creation with `checkAndConsumeUsage` (unless in dev with no auth)
- Deduct credits only when `billedAs` is 'credit'
- Log usage in `usageLogs` for audit trails

### Error Handling
- Throw `ConvexError` for expected errors (validation, auth, rate limits) - these are returned cleanly to clients
- Catch unexpected errors, log them, and either re-throw as ConvexError or mark the operation as failed
- In actions, always attempt to mark the audit as failed before throwing if an error occurs mid-process

### Performance
- **OCC (Optimistic Concurrency Control)**: Be aware that mutations can conflict; design idempotent mutations where possible
- **Read Amplification**: Avoid fetching unnecessary data; use indexes and select only needed fields
- **Function Limits**: Actions/mutations/queries have execution time limits (~5s for actions, ~s for queries). Offload heavy work to background if needed (though Convex actions already run in background)
- **Database Size**: Monitor table sizes; consider archiving old audit data if needed

### Testing
- Convex provides a testing harness; write tests in `__tests__` or similar
- Test schema, mutations, queries, and actions
- Mock external dependencies (crawler, aeoAnalyzer) in unit tests
- Use `ctx.runMutation` etc. in tests to invoke functions

### Migrations
- Use `@convex-dev/migrations` for schema changes
- Follow widen-migrate-narrow pattern for breaking changes
- Test migrations on a copy of production data before deploying

### Secrets & Environment Variables
- Never hardcode secrets; use Convex dashboard settings or `.env.local` for development
- Required vars: OPENROUTER_API_KEY, OPENROUTER_MODEL, RESEND_API_KEY, CONVEX_DEPLOYMENT, etc.
- In development, set `AUTH_EMAIL_MOCK=1` to avoid sending real emails

## Maintenance
Keep this file focused on Convex-specific guidance. Refer to the root CLAUDE.md for cross-cutting hard rules (Think before coding, Simplicity first, etc.). Update this file as the backend evolves.

## Rule Files
For detailed, domain-specific rules, see the files in `../.claude/rules/`:
- `../.claude/rules/convex-action-pattern.md` - Convex action pattern requirements
- `../.claude/rules/ai-output-handling.md` - Handling AI-generated content safely
- `../.claude/rules/credit-billing-integrity.md` - Credit and billing accuracy requirements
- `../.claude/rules/seo-aeo-validation.md` - Validating SEO/AEO outputs
- `../.claude/rules/observability.md` - Logging, monitoring, and alerting requirements

You need to mention the location of these files in claude.md so Claude knows they exist. For example, if you want Claude to follow certain specific instructions when writing APIs, you can add those in a rule file for them so that when Claude is working on them, it can load those instructions and use them directly.

## Example: Adding a New Action
1. Create `actions/newFeature.ts` with `'use node'`
2. Follow the action pattern: validate input → auth → rate limit → usage gate (if needed) → do work → return result
3. If writing to database, create a mutation in the same file or in `lib/`
4. Add appropriate indexes in schema.ts if querying by new fields
5. Write tests for the new action
6. Ensure any external calls are properly secured (SSRF, auth to external services)