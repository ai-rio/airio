---
phase: ai-visibility-sprint
plan: W2-01
type: execute
wave: 2
depends_on: ["W1-01"]
files_modified:
  - convex/lib/geo/sampler.ts
  - convex/lib/geo/stats.ts
  - convex/lib/geo/types.ts
  - convex/actions/geoMonitoring.ts
  - convex/visibilityReports.ts
autonomous: true
---

<objective>
## Goal
Track citation position (rank of first brand mention in LLM response) during sampling, compute average position per report, store it, and expose it via the existing `visibilityReports` queries.

## Purpose
Transforms PSOS from a binary "cited/not cited" metric into a richer "cited at position N" signal. Users can see not just whether they appear, but where they appear relative to competitors.

## Output
- `samplePerplexity()` returns `citationPosition` (0 = not cited, 1+ = position of first mention)
- `stats.ts` exports `averagePosition()` and `medianPosition()` pure functions
- `runSiteGeoCheck` computes avgPosition and passes to `visibilityReports.insert`
- `visibilityReports.insert` stores `avgPosition`
</objective>

<context>
## Source Files
@convex/lib/geo/sampler.ts
@convex/lib/geo/stats.ts
@convex/lib/geo/types.ts
@convex/actions/geoMonitoring.ts
@convex/visibilityReports.ts
</context>

<acceptance_criteria>

## AC-1: citationPosition returned by sampler
```gherkin
Given a Perplexity API response containing the brand name "Acme"
When samplePerplexity() processes the response
Then the returned CitationSample includes citationPosition >= 1
And if brand is not found, citationPosition = 0
```

## AC-2: averagePosition computed correctly
```gherkin
Given samples with citationPositions [2, 0, 1, 3, 0]
When averagePosition(samples) is called (excluding zeros)
Then it returns 2.0 (average of cited positions only)
```

## AC-3: avgPosition stored in visibilityReport
```gherkin
Given runSiteGeoCheck completes a sampling cycle
When a new visibilityReport is inserted
Then the report contains avgPosition as a number
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add citationPosition to CitationSample type and sampler</name>
  <files>convex/lib/geo/types.ts, convex/lib/geo/sampler.ts</files>
  <action>
    In `convex/lib/geo/types.ts`:
    - Add `citationPosition: number` to the `CitationSample` interface (0 = not cited, 1 = first brand mention word index as sentence rank, or simpler: 1 = cited, 2+ = position in source list)

    Use simple sentence-rank approach: split response on ". " or newlines, find first sentence containing brand name (case-insensitive), return 1-based index. If not found, return 0.

    In `convex/lib/geo/sampler.ts`, in `samplePerplexity()`:
    - After detecting `brandDetected` via `detectBrand()`, compute position:
    ```typescript
    function detectCitationPosition(text: string, brand: string): number {
      const sentences = text.split(/[.\n]/).map(s => s.trim()).filter(Boolean);
      const idx = sentences.findIndex(s => s.toLowerCase().includes(brand.toLowerCase()));
      return idx === -1 ? 0 : idx + 1;
    }
    ```
    - Add `citationPosition: detectCitationPosition(responseText, brandName)` to the returned `CitationSample`.
    - Also pass `citationPosition` when inserting into `visibilitySnapshots` (add to the insert call).
  </action>
  <verify>bun test convex/lib/geo/__tests__/ — existing tests still pass. Add 1 test for position detection.</verify>
  <done>AC-1 satisfied: sampler returns citationPosition in CitationSample</done>
</task>

<task type="auto">
  <name>Task 2: Add averagePosition and medianPosition to stats.ts</name>
  <files>convex/lib/geo/stats.ts</files>
  <action>
    Add two pure functions to `convex/lib/geo/stats.ts`:

    ```typescript
    /**
     * Average position among cited samples only (citationPosition > 0).
     * Returns null if no cited samples.
     */
    export function averagePosition(samples: Array<{ citationPosition: number }>): number | null {
      const cited = samples.filter(s => s.citationPosition > 0).map(s => s.citationPosition);
      if (cited.length === 0) return null;
      return cited.reduce((a, b) => a + b, 0) / cited.length;
    }

    /**
     * Median position among cited samples only.
     * Returns null if no cited samples.
     */
    export function medianPosition(samples: Array<{ citationPosition: number }>): number | null {
      const cited = samples.filter(s => s.citationPosition > 0).map(s => s.citationPosition).sort((a, b) => a - b);
      if (cited.length === 0) return null;
      const mid = Math.floor(cited.length / 2);
      return cited.length % 2 !== 0 ? cited[mid] : (cited[mid - 1] + cited[mid]) / 2;
    }
    ```

    Do NOT modify `computePsos()` or `wilsonCI()`.
  </action>
  <verify>bun test convex/lib/geo/__tests__/stats.test.ts — add tests for averagePosition([]) returns null, averagePosition([{citationPosition:0},{citationPosition:2}]) returns 2.</verify>
  <done>AC-2 satisfied: averagePosition and medianPosition exported and tested</done>
</task>

<task type="auto">
  <name>Task 3: Wire avgPosition into geoMonitoring and visibilityReports.insert</name>
  <files>convex/actions/geoMonitoring.ts, convex/visibilityReports.ts</files>
  <action>
    In `convex/actions/geoMonitoring.ts`, in `runSiteGeoCheck`:
    - Import `averagePosition` from `../lib/geo/stats`
    - After collecting all `CitationSample` results, compute:
      ```typescript
      const avgPos = averagePosition(allSamples);
      ```
    - Pass `avgPosition: avgPos ?? undefined` to `visibilityReports.insert`.

    In `convex/visibilityReports.ts`, in `insert` internal mutation:
    - Add `avgPosition: v.optional(v.number())` to args (matches schema field added in W1-01)
    - Include `avgPosition: args.avgPosition` in the `ctx.db.insert('visibilityReports', {...})` call.

    Keep the insert backward-compatible: avgPosition is optional, so existing callers without it still work.
  </action>
  <verify>npx convex dev --once — no TypeScript errors. Trigger a manual geo check run and confirm new visibilityReport row has avgPosition field populated.</verify>
  <done>AC-3 satisfied: avgPosition stored in new visibilityReport rows</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `computePsos()` or `wilsonCI()` logic in stats.ts
- `detectBrand()` in brandDetection.ts
- `visibilityReports.latestBySite` or `listBySite` query signatures
- Any dashboard UI files

## SCOPE LIMITS
- citationPosition is sentence-rank, not character offset — keep it simple
- averagePosition excludes non-cited samples (position = 0) from calculation
- This plan does NOT add competitor sampling — that is W2-02

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `bun test` — all existing tests pass
- [ ] New tests for averagePosition and medianPosition pass
- [ ] `npx convex dev --once` — no TypeScript errors
- [ ] A new visibilityReport row (after triggering a check) has avgPosition field
</verification>

<success_criteria>
- CitationSample type includes citationPosition
- sampler.ts computes and returns citationPosition per sample
- stats.ts exports averagePosition and medianPosition (pure, tested)
- geoMonitoring wires avgPosition into report insert
- visibilityReports.insert stores avgPosition
</success_criteria>

<output>
After completion, create `W2-01-SUMMARY.md` noting: functions added, test results, any edge cases found.
</output>
