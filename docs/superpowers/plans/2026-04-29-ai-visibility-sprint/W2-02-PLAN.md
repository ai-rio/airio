---
phase: ai-visibility-sprint
plan: W2-02
type: execute
wave: 2
depends_on: ["W1-01"]
files_modified:
  - convex/actions/geoMonitoring.ts
  - convex/visibilityReports.ts
autonomous: true
---

<objective>
## Goal
Enable competitive benchmarking: when a promptBasket has `competitors` defined, sample each competitor brand using the same prompts and store snapshots tagged with `brandName`. Expose a `getCompetitorComparison` query that returns a ranked table.

## Purpose
Growth+ plan feature. Users can see their PSOS vs competitor brands across the same prompts. Justifies the R$2.899/mês price point.

## Output
- `runSiteGeoCheck` loops over `basket.competitors` and samples each brand
- Competitor snapshots stored with `brandName` field set (own brand = undefined/null)
- New `getCompetitorComparison` query in `visibilityReports.ts`

## Cost implication
Each competitor doubles API sampling cost. For Growth plan (30 prompts × 3 competitors × 30 runs = 2,700 extra calls/month per site). This is by design — priced accordingly.
</objective>

<context>
## Source Files
@convex/actions/geoMonitoring.ts
@convex/visibilityReports.ts
@convex/lib/geo/sampler.ts
@convex/schema.ts
</context>

<acceptance_criteria>

## AC-1: Competitor brands sampled during geo check
```gherkin
Given a promptBasket with competitors: ["Concorrente X"]
When runSiteGeoCheck executes
Then visibilitySnapshots contains rows with brandName = "Concorrente X" alongside the own-brand rows
```

## AC-2: Own brand snapshots untagged
```gherkin
Given runSiteGeoCheck executes for own brand
When visibilitySnapshots are inserted for own brand
Then brandName is undefined (not set) on those rows
```

## AC-3: getCompetitorComparison returns ranked table
```gherkin
Given site has own-brand PSOS of 0.65 and competitor "Brand X" PSOS of 0.42
When getCompetitorComparison is called for that siteId
Then it returns [{brand: "own", psos: 0.65}, {brand: "Brand X", psos: 0.42}] sorted by psos desc
```

## AC-4: No competitor on free baskets
```gherkin
Given a basket with competitors: [] (empty array)
When runSiteGeoCheck executes
Then only own-brand sampling runs (no extra API calls)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Loop competitors in runSiteGeoCheck and store tagged snapshots</name>
  <files>convex/actions/geoMonitoring.ts</files>
  <action>
    In `runSiteGeoCheck` (in `convex/actions/geoMonitoring.ts`):

    1. After completing own-brand sampling, check `basket.competitors`:
    ```typescript
    const competitors = basket.competitors ?? [];
    ```

    2. For each competitor, run the same prompt loop using `samplePerplexity()` but with `brandName` set to the competitor string:
    ```typescript
    for (const competitorBrand of competitors) {
      for (const prompt of basket.prompts) {
        for (let run = 0; run < basket.runsPerPrompt; run++) {
          const sample = await samplePerplexity({
            prompt,
            brandName: competitorBrand,
            engine: basket.engine,
            apiKey: perplexityKey,
          });
          await ctx.runMutation(internal.visibilitySnapshots.insert, {
            siteId: args.siteId,
            basketId: basket._id,
            engine: basket.engine,
            prompt,
            runIndex: run,
            brandDetected: sample.brandDetected,
            citationPosition: sample.citationPosition,
            responseSnippet: sample.responseSnippet,
            sampledAt: Date.now(),
            brandName: competitorBrand,  // tags this as competitor snapshot
          });
        }
      }
    }
    ```

    3. Own-brand snapshots: ensure `brandName` is NOT set (leave field absent or set to undefined).

    IMPORTANT: Rate limiting — add a small delay between competitor batches to avoid API rate limits:
    ```typescript
    await new Promise(resolve => setTimeout(resolve, 500));
    ```
  </action>
  <verify>Trigger runSiteGeoCheck on a basket with one competitor. Check Convex dashboard — visibilitySnapshots should have rows with brandName set and rows without.</verify>
  <done>AC-1 and AC-2 satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Add getCompetitorComparison query</name>
  <files>convex/visibilityReports.ts</files>
  <action>
    Add a new `queryGeneric` export to `convex/visibilityReports.ts`:

    ```typescript
    export const getCompetitorComparison = queryGeneric({
      args: { siteId: v.id('sites') },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        const userId = identity.subject.split('|')[0];
        const site = await anyDb(ctx).get(args.siteId);
        if (!site || site.userId !== userId) return null;

        // Get latest report window (last 30 days)
        const since = Date.now() - 30 * 24 * 60 * 60 * 1000;

        // Fetch all snapshots in window for this site
        const snapshots = await anyDb(ctx)
          .query('visibilitySnapshots')
          .withIndex('by_site_and_sampled_at', (q: any) => q.eq('siteId', args.siteId).gte('sampledAt', since))
          .collect();

        // Group by brandName (undefined = own brand)
        const groups = new Map<string, { detected: number; total: number }>();
        for (const snap of snapshots) {
          const key = snap.brandName ?? '__own__';
          const group = groups.get(key) ?? { detected: 0, total: 0 };
          group.total++;
          if (snap.brandDetected) group.detected++;
          groups.set(key, group);
        }

        // Compute PSOS per group and sort descending
        const result = Array.from(groups.entries())
          .map(([key, g]) => ({
            brand: key === '__own__' ? site.name : key,
            isOwn: key === '__own__',
            psos: g.total > 0 ? g.detected / g.total : 0,
            samples: g.total,
          }))
          .sort((a, b) => b.psos - a.psos);

        return result;
      },
    });
    ```

    Note: This uses raw snapshot aggregation (no separate competitor visibilityReports rows). Simple and avoids schema changes.
  </action>
  <verify>Call `api.visibilityReports.getCompetitorComparison` from the Convex dashboard REPL with a valid siteId. Should return array with own brand + competitor entries.</verify>
  <done>AC-3 and AC-4 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Own-brand sampling logic in runSiteGeoCheck — only ADD competitor loop after it
- `computePsos()` or `wilsonCI()` — competitor PSOS uses simple ratio in query, not stored report
- `visibilityReports.insert` — competitor snapshots do NOT generate separate visibilityReports rows
- Any UI files

## SCOPE LIMITS
- Max competitors from basket.competitors — no server-side enforcement here (enforcement is in UI + gating)
- No competitor-specific visibilityReports rows — comparison is computed on-the-fly from snapshots
- This plan does NOT build the comparison UI — that is W3-01

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx convex dev --once` — no TypeScript errors
- [ ] After triggering geo check with competitor basket, snapshots with brandName appear in DB
- [ ] `getCompetitorComparison` query returns data with both own-brand and competitor entries
- [ ] Own-brand snapshots do NOT have brandName set
</verification>

<success_criteria>
- Competitor brands sampled via same prompts as own brand
- Snapshots tagged with brandName for competitors
- getCompetitorComparison query functional and auth-checked
- No performance regression on own-brand sampling
</success_criteria>

<output>
After completion, create `W2-02-SUMMARY.md` noting: competitor loop structure, query logic, estimated API cost per competitor.
</output>
