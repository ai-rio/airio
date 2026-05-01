---
phase: ai-visibility-sprint
plan: W3-01
type: execute
wave: 3
depends_on: ["W2-01", "W2-02"]
files_modified:
  - dashboard/app/sites/[siteId]/monitoring/page.tsx
autonomous: false
---

<objective>
## Goal
Add citation position display to Section 2 of the monitoring page and add a "Comparação" section showing the competitor benchmarking table from `getCompetitorComparison`.

## Purpose
Surfaces the new position + benchmarking data from Wave 2 in the UI. Without this, the backend work is invisible to users.

## Output
- Average position shown next to PSOS gauge in Section 2
- New Section 5 "Comparação" renders competitor comparison table (Growth+ only — shows locked state for lower plans)
</objective>

<context>
## Source Files
@dashboard/app/sites/[siteId]/monitoring/page.tsx
@dashboard/components/psos-gauge.tsx
</context>

<acceptance_criteria>

## AC-1: Average position displayed
```gherkin
Given a visibilityReport with avgPosition = 2.3
When the monitoring page renders Section 2
Then "Posição média: 2.3" is visible near the PSOS gauge
And if avgPosition is null/undefined, the field is not rendered
```

## AC-2: Comparison table renders with data
```gherkin
Given a Growth+ user with a site that has competitor snapshots
When they view Section 5 "Comparação"
Then a table shows: own brand row + competitor rows sorted by PSOS descending
And each row shows brand name, PSOS percentage, sample count
```

## AC-3: Comparison locked for non-Growth plans
```gherkin
Given a Starter or Pro user
When they view Section 5 "Comparação"
Then a locked overlay shows "Disponível no plano Growth ou superior"
And a link to /pricing is visible
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add avgPosition display to Section 2</name>
  <files>dashboard/app/sites/[siteId]/monitoring/page.tsx</files>
  <action>
    In the Section 2 block where `latestReport` is rendered (after PsosGauge + PsosChangeBadge):

    ```tsx
    {latestReport.avgPosition != null && (
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-2 uppercase tracking-[0.1em]">
        Posição média:{' '}
        <span className="text-foreground">
          {latestReport.avgPosition.toFixed(1)}
        </span>
      </p>
    )}
    ```

    Add `avgPosition` to the `VisibilityReport` local type definition at the top of the file:
    ```typescript
    type VisibilityReport = {
      psos: number;
      ciLower: number;
      ciUpper: number;
      totalSamples: number;
      citationCount: number;
      generatedAt: number;
      avgPosition?: number | null;  // add this
    };
    ```

    Do NOT fetch a new query — `latestReport` already has the field (added in W2-01 via visibilityReports.insert).
  </action>
  <verify>Monitoring page renders without errors. If a report exists with avgPosition, it shows.</verify>
  <done>AC-1 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Add Section 5 — Comparação with competitor table</name>
  <files>dashboard/app/sites/[siteId]/monitoring/page.tsx</files>
  <action>
    1. Add Convex query at top of component:
    ```typescript
    const comparison = useQuery(api.visibilityReports.getCompetitorComparison, { siteId: siteId as Id<'sites'> });
    ```

    2. Add `import { api } from 'airio-convex/_generated/api'` if not already imported (it is).

    3. Add Section 5 after Section 4 (alert config). Use `border-t border-border` pattern:

    ```tsx
    {/* Section 5 — Comparação */}
    <section className="px-8 py-8 border-t border-border">
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
        COMPARAÇÃO COMPETITIVA
      </p>

      {/* Lock for non-Growth plans — check site plan via users query */}
      {!canBenchmarkCompetitors && (
        <div className="border border-border p-6 text-center">
          <p className="font-sans text-muted-foreground text-[14px] mb-3">
            Comparação competitiva disponível no plano Growth ou superior.
          </p>
          <Link
            href="/pricing"
            className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:opacity-70 transition-opacity"
          >
            VER PLANOS →
          </Link>
        </div>
      )}

      {canBenchmarkCompetitors && comparison === undefined && (
        <div className="animate-pulse bg-muted h-16 w-full" />
      )}

      {canBenchmarkCompetitors && comparison !== null && comparison !== undefined && (
        comparison.length <= 1 ? (
          <p className="font-sans text-muted-foreground text-[14px]">
            Nenhum concorrente configurado.{' '}
            <Link href={`/sites/${siteId}/prompts`} className="text-[var(--brand-text)] hover:opacity-70">
              Adicionar →
            </Link>
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-left pb-2">Marca</th>
                <th className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-right pb-2">PSOS</th>
                <th className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-muted-foreground text-right pb-2">Amostras</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.brand} className="border-b border-border last:border-0">
                  <td className="py-3 font-sans text-foreground text-[14px]">
                    {row.isOwn ? <span className="text-[var(--brand-text)]">{row.brand} ★</span> : row.brand}
                  </td>
                  <td className="py-3 font-[family-name:var(--font-mono)] text-[13px] text-right">
                    {Math.round(row.psos * 100)}%
                  </td>
                  <td className="py-3 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground text-right">
                    {row.samples}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}
    </section>
    ```

    4. Add `canBenchmarkCompetitors` logic. For now, derive from `me` query:
    ```typescript
    const me = useQuery(api.users.getMe);
    const canBenchmarkCompetitors = me?.plan === 'growth' || me?.plan === 'enterprise';
    ```

    Import `api.users.getMe` if not already imported in this file.

    Follow design-system.md: no rounded-*, no hardcoded colors, use CSS var tokens.
  </action>
  <verify>cd dashboard && bun run build — no TypeScript errors. Page renders with comparison section visible.</verify>
  <done>AC-2 and AC-3 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Position display + competitor comparison table in monitoring page</what-built>
  <how-to-verify>
    1. Run: cd dashboard && bun run dev
    2. Visit: /sites/[siteId]/monitoring
    3. Confirm: avgPosition shows near PSOS gauge (or absent when no data)
    4. Confirm: Section 5 shows locked state for free/starter user
    5. If Growth plan user: confirm comparison table renders
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Sections 1-4 of the monitoring page — only add to Section 2 and append Section 5
- `PsosGauge`, `PsosChangeBadge`, `PsosSparkline` component internals
- `api.visibilityReports.latestBySite` and `listBySite` queries

## SCOPE LIMITS
- No competitor management UI here (add/remove competitors from basket) — that stays on the prompts page
- canBenchmarkCompetitors check is read-only from users.plan — gating enforcement is W4-01

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `bun run build` exits 0
- [ ] avgPosition renders when present, hidden when null
- [ ] Section 5 visible at bottom of monitoring page
- [ ] Locked state shows for non-Growth plans
- [ ] Comparison table renders correctly when data present
</verification>

<success_criteria>
- Position data visible in monitoring UI
- Competitor comparison section built with correct lock behavior
- No regressions in existing sections 1-4
- Build clean
</success_criteria>

<output>
After completion, create `W3-01-SUMMARY.md` noting: UI additions, any layout adjustments needed.
</output>
