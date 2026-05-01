---
phase: ai-visibility-sprint
plan: W4-01
type: execute
wave: 4
depends_on: ["W1-01", "W3-03"]
files_modified:
  - convex/users.ts
  - convex/sites.ts
  - dashboard/app/monitoring/page.tsx
autonomous: false
---

<objective>
## Goal
Gate monitoring access behind a paid plan. Free users (users.plan = undefined) see a locked overlay with a link to /pricing. The `setMonitoringEnabled` mutation rejects activation attempts from free users. `canEnableMonitoring()` is the single source of truth for access control.

## Purpose
Enables monetisation of the monitoring module. Without gating, free users get the full product for R$0.

## Output
- `canEnableMonitoring(plan: string | undefined): boolean` helper in `convex/users.ts`
- `setMonitoringEnabled` mutation in `convex/sites.ts` rejects if plan is undefined
- `/monitoring` page shows locked empty state for free users instead of "Adicionar site" flow
</objective>

<context>
## Source Files
@convex/users.ts
@convex/sites.ts
@dashboard/app/monitoring/page.tsx
</context>

<acceptance_criteria>

## AC-1: canEnableMonitoring returns correct values
```gherkin
Given plan values of undefined, 'starter', 'pro', 'growth', 'enterprise'
When canEnableMonitoring(plan) is called
Then undefined → false, 'starter' → true, 'pro' → true, 'growth' → true, 'enterprise' → true
```

## AC-2: setMonitoringEnabled rejects for free users
```gherkin
Given a user with users.plan = undefined
When setMonitoringEnabled({ siteId, enabled: true }) is called
Then it throws an error "Plano pago necessário para ativar monitoramento"
And the site's monitoringEnabled field is unchanged
```

## AC-3: /monitoring page shows locked state for free users
```gherkin
Given a user with no plan visits /monitoring
When the page loads
Then instead of the site grid or "add site" CTA, they see:
  "Monitoramento disponível em planos pagos" + link to /pricing
```

## AC-4: Existing paid users unaffected
```gherkin
Given a user with users.plan = 'pro' with 2 monitored sites
When they visit /monitoring
Then they see their site cards as before (no regression)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add canEnableMonitoring helper and export getMe plan field</name>
  <files>convex/users.ts</files>
  <action>
    In `convex/users.ts`:

    1. Add a pure helper (not a query — just a function used by mutations):
    ```typescript
    export function canEnableMonitoring(plan: string | undefined | null): boolean {
      return plan === 'starter' || plan === 'pro' || plan === 'growth' || plan === 'enterprise';
    }
    ```

    2. Ensure `getMe` query returns `plan` field. Check if it already does. If not, add `plan: user.plan` to the returned object.

    Do NOT change any billing logic, credit logic, or auth logic.
  </action>
  <verify>npx convex dev --once — no TypeScript errors. canEnableMonitoring is exported.</verify>
  <done>AC-1 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Guard setMonitoringEnabled mutation in sites.ts</name>
  <files>convex/sites.ts</files>
  <action>
    In `convex/sites.ts`, in the `setMonitoringEnabled` mutation handler:

    1. Import `canEnableMonitoring` from `./users`.
    2. After the auth check (get identity), fetch the user record:
    ```typescript
    const userRecord = await anyDb(ctx).query('users')
      .withIndex('email', (q: any) => q.eq('email', identity.email))
      .first();
    ```
    
    Wait — check how other mutations in sites.ts fetch the user to use the same pattern. Match existing code style exactly.

    3. Add guard:
    ```typescript
    if (args.enabled && !canEnableMonitoring(userRecord?.plan)) {
      throw new Error('Plano pago necessário para ativar monitoramento');
    }
    ```

    This only fires when `enabled = true`. Disabling monitoring (enabled = false) is always allowed.

    Do NOT change the ownership check that should already be in this mutation.
  </action>
  <verify>Call setMonitoringEnabled with a free user (plan undefined) in Convex dashboard. Should throw. Call with plan = 'starter' — should succeed.</verify>
  <done>AC-2 satisfied</done>
</task>

<task type="auto">
  <name>Task 3: Add locked state to /monitoring page for free users</name>
  <files>dashboard/app/monitoring/page.tsx</files>
  <action>
    In `dashboard/app/monitoring/page.tsx`:

    1. Add user plan query:
    ```typescript
    const me = useQuery(api.users.getMe);
    const isPaidPlan = me?.plan != null && ['starter','pro','growth','enterprise'].includes(me.plan);
    ```

    2. Add a locked empty state component at the top of the Page component render, before the site grid logic:

    ```tsx
    {me !== undefined && !isPaidPlan && (
      <div className="px-8 py-16 flex flex-col items-start gap-4">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
          Monitoramento de Visibilidade em IA
        </p>
        <h2 className="font-[family-name:var(--font-bebas)] text-[48px] leading-none">
          Disponível em Planos Pagos
        </h2>
        <p className="font-sans text-muted-foreground text-[16px] max-w-md">
          Monitore a presença da sua marca no ChatGPT, Gemini e Perplexity toda semana, com intervalos de confiança estatística e alertas automáticos.
        </p>
        <Link href="/pricing">
          <button
            type="button"
            className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity"
          >
            VER PLANOS →
          </button>
        </Link>
      </div>
    )}

    {(me === undefined || isPaidPlan) && (
      // existing site grid / loading / empty state
      ...
    )}
    ```

    Wrap the existing page content in the `isPaidPlan` condition.
    When `me === undefined` (loading), show the existing content (avoids flash of locked state).

    Follow design-system.md — no rounded-*, no hardcoded colors.
  </action>
  <verify>bun run build — no errors. Visit /monitoring with a free user account — locked state shows.</verify>
  <done>AC-3 and AC-4 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Plan gating — locked state on /monitoring, mutation guard in setMonitoringEnabled</what-built>
  <how-to-verify>
    1. Run: cd dashboard && bun run dev
    2. Sign in as a free user (no plan set)
    3. Visit /monitoring — confirm locked overlay with "VER PLANOS →" shows
    4. Click "VER PLANOS →" — confirm navigates to /pricing
    5. Sign in as paid user — confirm site grid shows as before
    6. (Optional) Try calling setMonitoringEnabled(true) as free user via Convex dashboard — confirm error thrown
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Existing audit credit billing in convex/users.ts (checkAndConsumeUsage, getMyCreditsBalance)
- DodoPayments webhook or checkout logic
- /sites/[siteId]/monitoring page — gating is only at the /monitoring list level
- Alert config mutations — those remain accessible regardless of plan

## SCOPE LIMITS
- plan field is checked as a string — no complex plan hierarchy logic
- No plan upgrade mutation — that is a separate billing flow (DodoPayments webhook sets plan on purchase)
- sites/[siteId]/monitoring is NOT gated — once a site is monitored, the detail page stays accessible

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx convex dev --once` — no TypeScript errors
- [ ] `bun run build` exits 0
- [ ] Free user sees locked overlay on /monitoring
- [ ] Paid user sees site grid unchanged
- [ ] setMonitoringEnabled throws for free user (enabled=true)
- [ ] setMonitoringEnabled(enabled=false) works for all users
</verification>

<success_criteria>
- canEnableMonitoring helper implemented and exported
- Mutation guard active in setMonitoringEnabled
- /monitoring locked state for free users with /pricing link
- No regression for paid users
</success_criteria>

<output>
After completion, create `W4-01-SUMMARY.md` noting: gating pattern used, any edge cases (e.g. plan expiry), deferred items (DodoPayments plan sync).
</output>
