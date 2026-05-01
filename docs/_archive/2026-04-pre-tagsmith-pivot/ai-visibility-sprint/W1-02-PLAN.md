---
phase: ai-visibility-sprint
plan: W1-02
type: execute
wave: 1
depends_on: []
files_modified:
  - dashboard/app/sites/[siteId]/page.tsx
autonomous: false
---

<objective>
## Goal
Remove the PSOS/visibility section from the site detail page and replace it with Auditoria/Visibilidade tab navigation. Monitoring data now lives exclusively at `/sites/[siteId]/monitoring`.

## Purpose
Sprint requires audit and monitoring to be clearly separated. The PSOS section in `sites/[siteId]/page.tsx` is redundant — the dedicated monitoring page is now built. Keeping both creates confusion.

## Output
`sites/[siteId]/page.tsx` shows Auditoria tab (audit history, alert config) and Visibilidade tab (link to monitoring page or inline PSOS summary). No duplicate PSOS gauge.
</objective>

<context>
## Source Files
@dashboard/app/sites/[siteId]/page.tsx
@dashboard/app/sites/[siteId]/monitoring/page.tsx
</context>

<acceptance_criteria>

## AC-1: PSOS removed from audit tab
```gherkin
Given a user visits /sites/[siteId]
When the Auditoria tab is active (default)
Then no PsosGauge, PsosSparkline, or "Gerenciar prompts" link is visible
```

## AC-2: Visibilidade tab links to monitoring
```gherkin
Given a user visits /sites/[siteId]
When they click the Visibilidade tab
Then they see a link or redirect to /sites/[siteId]/monitoring
```

## AC-3: Auditoria tab retains existing content
```gherkin
Given a user visits /sites/[siteId]
When the Auditoria tab is active
Then audit history, alert config sections are all present and functional
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Remove PsosSection and add tab navigation</name>
  <files>dashboard/app/sites/[siteId]/page.tsx</files>
  <action>
    1. Remove the entire `PsosSection` component (the function that renders PsosGauge + PsosSparkline + "Gerenciar prompts" button) and its usage in the main page.
    2. Remove related imports: `PsosGauge`, `PsosSparkline`, and their Convex queries (`api.visibilityReports.latestBySite`, `api.visibilityReports.listBySite`).
    3. Add a simple tab nav at the top of the page content (below the site header section):

    ```tsx
    // Tab state
    const [tab, setTab] = useState<'auditoria' | 'visibilidade'>('auditoria');

    // Tab nav render (use design system tokens — no rounded-*, no hardcoded colors)
    <div className="flex border-b border-border px-8">
      {(['auditoria', 'visibilidade'] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={[
            'font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] px-4 py-3 border-b-2 transition-colors',
            tab === t
              ? 'border-[var(--brand)] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t === 'auditoria' ? 'Auditoria' : 'Visibilidade IA'}
        </button>
      ))}
    </div>
    ```

    4. Wrap existing audit sections (AuditHistorySection, AlertConfigSection) in `{tab === 'auditoria' && ...}`.
    5. Add Visibilidade tab content:
    ```tsx
    {tab === 'visibilidade' && (
      <div className="px-8 py-8">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
          VISIBILIDADE EM IA
        </p>
        <p className="font-sans text-muted-foreground text-[14px] mb-4">
          Configure e acompanhe a presença da sua marca em buscas de IA.
        </p>
        <Link href={`/sites/${siteId}/monitoring`}>
          <Button className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity">
            VER MONITORAMENTO →
          </Button>
        </Link>
      </div>
    )}
    ```

    IMPORTANT: Follow design-system.md rules — no rounded-*, no hardcoded colors, no font-bold for headings.
  </action>
  <verify>cd dashboard && bun run build — no TypeScript errors. Visit /sites/[siteId] and confirm tabs render.</verify>
  <done>AC-1, AC-2, AC-3 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Tab navigation on sites detail page with PSOS removed from audit tab</what-built>
  <how-to-verify>
    1. Run: cd dashboard && bun run dev
    2. Visit: /sites/[any-siteId]
    3. Confirm: "Auditoria" tab is active by default, shows audit history + alerts, NO PSOS gauge
    4. Click "Visibilidade IA" tab: confirms link to /sites/[siteId]/monitoring visible
    5. Click link: monitoring page loads correctly
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `dashboard/app/sites/[siteId]/monitoring/page.tsx` — leave intact
- `dashboard/app/sites/[siteId]/prompts/page.tsx` — leave intact
- AlertConfigSection content — only wrap in tab condition, don't modify
- AuditHistorySection content — only wrap in tab condition, don't modify

## SCOPE LIMITS
- No routing changes — tabs are client-side state, not URL params
- Do not add PSOS data to the Visibilidade tab — just a link to /monitoring

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `bun run build` exits 0
- [ ] Biome lint: `bunx biome check dashboard/app/sites/` — no errors
- [ ] No PsosGauge or PsosSparkline imports remain in sites/[siteId]/page.tsx
- [ ] Both tabs render without console errors
</verification>

<success_criteria>
- PSOS section removed from site detail page
- Tab navigation works client-side
- Existing alert config and audit history intact in Auditoria tab
- Visibilidade tab links to monitoring page
- Build clean
</success_criteria>

<output>
After completion, create `W1-02-SUMMARY.md` noting: components removed, tab structure implemented.
</output>
