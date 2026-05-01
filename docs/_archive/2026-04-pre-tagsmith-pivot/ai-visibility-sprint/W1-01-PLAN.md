---
phase: ai-visibility-sprint
plan: W1-01
type: execute
wave: 1
depends_on: []
files_modified:
  - convex/schema.ts
autonomous: true
---

<objective>
## Goal
Add 5 optional schema fields to support citation position tracking and competitive benchmarking. All additions use `v.optional()` — existing rows are unaffected.

## Purpose
Unblocks Wave 2 backend work. Without these fields, `sampler.ts` has nowhere to store position data and `geoMonitoring.ts` cannot tag competitor snapshots.

## Output
Updated `convex/schema.ts` deployed to `tidy-spider-214.convex.cloud`.
</objective>

<context>
## Project Context
Stack: Convex + Next.js 15. Branch: `feat/monitoring-platform`.

## Source Files
@convex/schema.ts
</context>

<acceptance_criteria>

## AC-1: citationPosition on visibilitySnapshots
```gherkin
Given a visibilitySnapshot is inserted without citationPosition
When the row is read back
Then it exists without error (optional field absent is valid)
```

## AC-2: brandName on visibilitySnapshots
```gherkin
Given a snapshot is inserted with brandName: "competitor-brand"
When the row is read back
Then brandName equals "competitor-brand"
```

## AC-3: avgPosition on visibilityReports
```gherkin
Given a visibilityReport is inserted without avgPosition
When the row is read back
Then it exists without error
```

## AC-4: competitors on promptBaskets
```gherkin
Given a promptBasket is updated to add competitors: ["Brand X"]
When the basket is read back
Then competitors array contains "Brand X"
```

## AC-5: No existing data broken
```gherkin
Given existing visibilitySnapshots rows exist without the new fields
When Convex deploys the updated schema
Then existing rows remain readable (optional fields default to undefined)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add citationPosition and brandName to visibilitySnapshots</name>
  <files>convex/schema.ts</files>
  <action>
    In `convex/schema.ts`, find the `visibilitySnapshots` table definition.
    After `sampledAt: v.number()`, add:
    ```typescript
    citationPosition: v.optional(v.number()), // 0 = not cited, 1 = first mention, 2 = second, etc.
    brandName: v.optional(v.string()),         // null = own brand, set = competitor brand name
    ```
    Both MUST be v.optional() — existing rows lack these fields.
    Do NOT change any existing indexes.
  </action>
  <verify>npx convex dev --once (or check Convex dashboard for schema errors)</verify>
  <done>AC-1 and AC-2 satisfied: fields present in schema, no deploy error</done>
</task>

<task type="auto">
  <name>Task 2: Add avgPosition to visibilityReports and competitors to promptBaskets</name>
  <files>convex/schema.ts</files>
  <action>
    1. In `visibilityReports` table, after `generatedAt: v.number()`, add:
    ```typescript
    avgPosition: v.optional(v.number()), // average citation position across all sampled prompts
    ```

    2. In `promptBaskets` table, after `enabled: v.boolean()`, add:
    ```typescript
    competitors: v.optional(v.array(v.string())), // competitor brand names to sample alongside own brand
    ```

    Both MUST be v.optional(). Do NOT modify existing indexes or other fields.

    NOTE: Do NOT expand `engine` union to include 'gemini' — that is Wave 5 work.
  </action>
  <verify>npx convex dev --once — no schema errors; existing visibilityReports queries still return data</verify>
  <done>AC-3 and AC-4 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Existing indexes on any table
- `engine: v.union(v.literal('perplexity'))` in promptBaskets — Gemini is Wave 5
- Any file outside `convex/schema.ts`

## SCOPE LIMITS
- No data migrations — all fields are optional, Convex handles absent fields transparently
- No query/mutation changes in this plan — that is Wave 2

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx convex dev --once` exits 0
- [ ] `visibilitySnapshots` in Convex dashboard shows new optional fields in schema
- [ ] `visibilityReports` shows `avgPosition` optional field
- [ ] `promptBaskets` shows `competitors` optional field
- [ ] Existing monitoring page still loads without error
</verification>

<success_criteria>
- All 4 optional fields added to schema.ts
- Convex deploy succeeds with no errors
- No existing data or queries broken
- Wave 2 plans unblocked
</success_criteria>

<output>
After completion, create `W1-01-SUMMARY.md` noting: fields added, any deploy warnings observed.
</output>
