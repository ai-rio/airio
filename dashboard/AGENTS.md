# Dashboard - Airio App (seo.ai.rio.br)

This is the Next.js 15 application for the Airio dashboard, accessible at seo.ai.rio.br.

## Purpose
- User authentication and session management (via @convex-dev/auth + Resend)
- Display audit results and download generated reports
- Manage billing and credit packs via DodoPayments
- User settings and profile management
- Navigation between audit, report, billing, and settings pages

## Commands
```bash
# Development
bun run dev          # Runs on http://localhost:3002

# Production build
bun run build

# Start production server
bun run start        # Runs on http://localhost:3002

# Linting
bun run lint
```

## Tech Stack
- Next.js 15 (App Router)
- Tailwind 4 for styling
- @convex-dev/auth + Resend for magic-link email authentication
- Convex client for real-time data and mutations
- DodoPayments SDK for credit pack purchases
- shadcn/ui via @shadcn/ui primitives (using base-ui/react)
- Lucide React for icons
- Playwright for E2E testing (configured but not shown in scripts)

## Key Flows

### Authentication Flow
1. User visits any protected route → redirected to `/sign-in`
2. User enters email → receives magic link via Resend
3. User clicks link → session established via Convex auth
4. On subsequent visits, session is validated automatically
5. Protected routes use `ConvexAuthNextjsServerProvider` and `ConvexClientProvider`

### Audit Viewing Flow
1. User navigates to `/audit` → lists all audits (from `audits` table)
2. Clicking an audit → `/audit/[id]` shows:
   - Audit score and status
   - Download buttons for generated files (robots.txt, llms.txt, fixes, etc.)
   - Option to re-run audit (if credits allow)

### Billing Flow
1. User navigates to `/billing` → sees current plan and credit balance
2. User clicks "Buy Credits" → opens DodoPayments checkout
3. Successful purchase → updates `users.credits` in Convex
4. Dashboard reflects new balance immediately

### Settings Flow
1. User navigates to `/settings` → can:
   - Update profile information
   - Manage notification preferences
   - Delete account (with confirmation)

## Dashboard-Specific Guidelines

### Authentication
- **Always** wrap API routes and server components with `ConvexAuthNextjsServerProvider`
- **Always** wrap client components needing auth with `ConvexClientProvider`
- Never access user data without verifying authentication state

### Data Fetching
- Use Convex reactive queries (`useQuery`, `useMutation`) for real-time updates
- For initial data loads, leverage Next.js 15 `generateStaticParams` where appropriate
- Handle loading and error states gracefully in UI

### UI Components
- Use Tailwind 4 utility classes consistently
- Leverage shadcn/ui primitives from `@base-ui/react` for consistent UI
- Follow existing component patterns in `/components` directory
- Keep components small and focused; extract reusable UI to `/components/ui`

### State Management
- Prefer React state (`useState`, `useReducer`) for UI-only state
- Use Convex for shared, persistent state across users/sessions
- Avoid prop drilling; use Context or state management libraries only when necessary

### Error Handling
- Catch and display user-friendly errors from Convex actions
- Log unexpected errors to console for debugging
- Show retry mechanisms for transient failures (network, rate limits)

### Performance
- Optimize images and assets using Next.js Image component
- Lazy-load non-critical components
- Use `next/font` for optimized font loading (Geist already configured)
- Bundle analyzer: run `next build` and inspect output for unexpected bloat

### Testing
- Write Playwright tests for critical user flows (auth, audit viewing, billing)
- Keep test files alongside the feature they test (`*.test.ts`)
- Use `data-testid` attributes for reliable selectors

## Rule Files
For detailed, domain-specific rules, see the files in `../../.claude/rules/`:
- `../../.claude/rules/convex-action-pattern.md` - Convex action pattern requirements
- `../../.claude/rules/ai-output-handling.md` - Handling AI-generated content safely
- `../../.claude/rules/credit-billing-integrity.md` - Credit and billing accuracy requirements
- `../../.claude/rules/seo-aeo-validation.md` - Validating SEO/AEO outputs
- `../../.claude/rules/observability.md` - Logging, monitoring, and alerting requirements

You need to mention the location of these files in claude.md so Claude knows they exist. For example, if you want Claude to follow certain specific instructions when writing APIs, you can add those in a rule file for them so that when Claude is working on them, it can load those instructions and use them directly.

## Maintenance
Keep this file focused on dashboard-specific guidance. Refer to the root CLAUDE.md for cross-cutting hard rules (Think before coding, Simplicity first, etc.). Update this file as the dashboard evolves.