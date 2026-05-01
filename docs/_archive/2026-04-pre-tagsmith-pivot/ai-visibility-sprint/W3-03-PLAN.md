---
phase: ai-visibility-sprint
plan: W3-03
type: execute
wave: 3
depends_on: []
files_modified:
  - dashboard/app/pricing/page.tsx
  - dashboard/components/dashboard-nav.tsx
autonomous: false
---

<objective>
## Goal
Build the `/pricing` route displaying the 4 monitoring subscription tiers in BRL with DodoPayments checkout links. Linked from the monitoring locked state and the nav avatar menu.

## Purpose
Converts users who hit the monitoring gate into paying customers. Without this page, the gating (W4-01) has nowhere to send users.

## Output
`dashboard/app/pricing/page.tsx` — 4 plan cards in BRL, CTA buttons, cross-sell link to audit credits.
</objective>

<context>
## Design System
@dashboard/.claude/rules/design-system.md (mandatory — read before implementing)
@dashboard/app/globals.css

## Pricing Data
Starter: R$579/mês — 1 site, 5 prompts, 1 engine
Pro: R$1.449/mês — 3 sites, 15 prompts, 2 engines, PSOS trends + alerts
Growth: R$2.899/mês — 10 sites, 30 prompts, 3 engines, competitor benchmarking (3/site)
Enterprise: a partir de R$8.700/mês — unlimited, white-label, API access

## Button Behavior
Starter/Pro/Growth: DodoPayments checkout URL (use placeholder /api/checkout?plan=X until DodoPayments subscription API is wired)
Enterprise: mailto:enterprise@ai.rio.br
</context>

<acceptance_criteria>

## AC-1: All 4 plan cards render with correct BRL prices
```gherkin
Given a user visits /pricing
When the page loads
Then 4 cards show: R$579, R$1.449, R$2.899, "a partir de R$8.700"
And each card shows correct site/prompt/engine limits
```

## AC-2: Design system compliance
```gherkin
Given the pricing page renders
When inspected
Then no rounded-* classes exist
And all colors use CSS var tokens (no text-gray-*, bg-green-*, etc.)
And headings use Bebas Neue font class
```

## AC-3: CTA buttons functional
```gherkin
Given a user clicks "Iniciar trial" on Pro plan
When the button is clicked
Then they are directed to /api/checkout?plan=pro (placeholder for DodoPayments)
```

## AC-4: Cross-sell link present
```gherkin
Given a user is on /pricing
When they scroll to the bottom
Then a link "Prefere créditos avulsos? Ver planos de auditoria →" links to /billing
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create pricing page with 4 BRL plan cards</name>
  <files>dashboard/app/pricing/page.tsx</files>
  <action>
    Create `dashboard/app/pricing/page.tsx` as a server component (no 'use client' needed — no state):

    ```tsx
    import Link from 'next/link';

    const plans = [
      {
        id: 'starter',
        name: 'Starter',
        price: 'R$579',
        period: '/mês',
        sites: 1,
        prompts: 5,
        engines: 1,
        features: ['Dashboard básico', 'PSOS semanal', 'Alertas por e-mail', 'Diagnóstico de citações'],
        locked: [],
        cta: 'Iniciar trial gratuito',
        href: '/api/checkout?plan=starter',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 'R$1.449',
        period: '/mês',
        sites: 3,
        prompts: 15,
        engines: 2,
        features: ['Tudo do Starter', 'Histórico de tendências PSOS', 'Alertas de queda configuráveis', '2 motores de IA'],
        locked: [],
        cta: 'Iniciar trial gratuito',
        href: '/api/checkout?plan=pro',
        highlight: true,
      },
      {
        id: 'growth',
        name: 'Growth',
        price: 'R$2.899',
        period: '/mês',
        sites: 10,
        prompts: 30,
        engines: 3,
        features: ['Tudo do Pro', 'Benchmarking competitivo (3 concorrentes/site)', '3 motores de IA'],
        locked: [],
        cta: 'Iniciar trial gratuito',
        href: '/api/checkout?plan=growth',
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'a partir de R$8.700',
        period: '/mês',
        sites: 'Ilimitado',
        prompts: 'Ilimitado',
        engines: 'Todos',
        features: ['Tudo do Growth', 'Relatórios white-label', 'Acesso à API', 'SLA + suporte prioritário'],
        locked: [],
        cta: 'Falar com vendas',
        href: 'mailto:enterprise@ai.rio.br',
      },
    ] as const;

    export default function PricingPage() {
      return (
        <div>
          {/* Header */}
          <section className="px-8 py-16 border-b border-border">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-3">
              Monitoramento de Visibilidade em IA
            </p>
            <h1 className="font-[family-name:var(--font-bebas)] text-[64px] leading-none mb-4">
              Planos de Monitoramento
            </h1>
            <p className="font-sans text-muted-foreground text-[16px] max-w-xl">
              Visibilidade em IA não é estática. Monitore a presença da sua marca no ChatGPT, Gemini e Perplexity toda semana, com intervalos de confiança estatística.
            </p>
          </section>

          {/* Cards grid */}
          <section className="px-8 py-12 border-b border-border">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-px border border-border">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-8 flex flex-col ${plan.highlight ? 'bg-[var(--surface-yellow)]' : 'bg-card'}`}
                >
                  {plan.highlight && (
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--brand-fg)] bg-[var(--brand)] px-2 py-0.5 uppercase tracking-[0.1em] self-start mb-4">
                      Popular
                    </p>
                  )}
                  <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
                    {plan.name}
                  </p>
                  <div className="mt-2 mb-6">
                    <span className="font-[family-name:var(--font-bebas)] text-[48px] leading-none">
                      {plan.price}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>

                  <div className="space-y-1 mb-6 text-[13px] font-[family-name:var(--font-mono)] text-muted-foreground">
                    <p>{plan.sites} {typeof plan.sites === 'number' ? 'site' + (plan.sites > 1 ? 's' : '') : 'sites'}</p>
                    <p>{plan.prompts} prompts por site</p>
                    <p>{plan.engines} {typeof plan.engines === 'string' ? 'motores' : plan.engines === 1 ? 'motor de IA' : 'motores de IA'}</p>
                  </div>

                  <ul className="space-y-2 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="font-sans text-foreground text-[13px] flex gap-2">
                        <span className="text-[var(--brand-text)]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href={plan.href}>
                    <button
                      type="button"
                      className="w-full bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity"
                    >
                      {plan.cta}
                    </button>
                  </Link>
                </div>
              ))}
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-6 uppercase tracking-[0.05em]">
              Todos os planos incluem: amostragem semanal, 30 amostras por prompt, intervalos de confiança Wilson 95%, histórico de tendências e diagnóstico de falhas de citação.
            </p>
          </section>

          {/* Cross-sell */}
          <section className="px-8 py-8">
            <p className="font-sans text-muted-foreground text-[14px]">
              Prefere créditos avulsos para auditorias pontuais?{' '}
              <Link
                href="/billing"
                className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:opacity-70 transition-opacity"
              >
                Ver créditos de auditoria →
              </Link>
            </p>
          </section>
        </div>
      );
    }
    ```

    MANDATORY: no rounded-*, no hardcoded colors, no font-bold for headings. All from design-system.md.
  </action>
  <verify>bun run build — no errors. Visit /pricing in browser.</verify>
  <done>AC-1, AC-2, AC-3, AC-4 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Link pricing from nav avatar dropdown</name>
  <files>dashboard/components/dashboard-nav.tsx</files>
  <action>
    In `dashboard/components/dashboard-nav.tsx`, in the avatar dropdown menu, add a "Ver planos" link above the Faturamento link:

    ```tsx
    <div className="border-b border-border">
      <Link
        href="/pricing"
        onClick={() => setMenuOpen(false)}
        className="w-full flex items-center gap-2 px-4 py-3 font-[family-name:var(--font-mono)] text-[12px] uppercase tracking-[0.1em] text-foreground hover:bg-muted transition-colors"
      >
        Ver Planos
      </Link>
    </div>
    ```

    Place it between the email display and the Faturamento link.
  </action>
  <verify>Avatar dropdown shows "Ver Planos" link. Clicking navigates to /pricing.</verify>
  <done>Pricing page discoverable from nav</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Pricing page with 4 BRL plan cards + nav link</what-built>
  <how-to-verify>
    1. Run: cd dashboard && bun run dev
    2. Visit: /pricing
    3. Confirm 4 cards with correct BRL prices
    4. Confirm Pro card has "Popular" badge and yellow tint
    5. Confirm no rounded-* classes visible, no hardcoded colors
    6. Click avatar → confirm "Ver Planos" link appears
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `dashboard/components/dashboard-nav.tsx` beyond adding the pricing link
- `/billing` page
- DodoPayments checkout logic — CTAs use placeholder URLs until DodoPayments subscription API is wired

## SCOPE LIMITS
- No actual DodoPayments subscription creation in this plan
- /api/checkout?plan=X endpoints are placeholder — routing to them will 404 for now
- No trial length logic — just the UI and the link

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `bun run build` exits 0
- [ ] /pricing renders with correct prices and plan limits
- [ ] No design system violations (rounded-*, hardcoded colors, font-bold headings)
- [ ] Nav avatar dropdown includes pricing link
- [ ] Cross-sell link to /billing at bottom
</verification>

<success_criteria>
- Pricing page live at /pricing
- 4 BRL plan cards with correct data
- Design system compliant
- Nav link added
- Build clean
</success_criteria>

<output>
After completion, create `W3-03-SUMMARY.md` noting: page structure, any design decisions, DodoPayments wiring deferred.
</output>
