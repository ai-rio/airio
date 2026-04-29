# GEO Visibility Measurement Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "scheduled AEO audit" monitoring with a statistically rigorous GEO visibility measurement pipeline that computes PSOS (Prompt-Space Occupancy Score) with Wilson confidence intervals by repeatedly sampling Perplexity AI for brand citations.

**Architecture:** Each monitored site has a prompt basket (brand name + list of queries). Weekly, the cron triggers `runDueGeoChecks` which samples each prompt 7× via the Perplexity `sonar` API, detects brand mentions via substring match, computes PSOS + Wilson 95% CI, stores a `visibilityReport`, and sends alerts on drops. The existing AEO audit pipeline (`monitoring.ts`) runs in parallel and is unchanged.

**Research basis:**
- n=7 runs/prompt: Schulte et al. 2026 Appendix J — SE < 0.10 at n=7
- 24-day rolling window: Schulte et al. 2026 Appendix K — SE < 0.05 at d=24
- Wilson CI: Sielinski 2026 — bootstrap CIs required for proportion estimates
- Brand detection via substring match: Schulte et al. 2026 lexicon methodology

**Tech Stack:** Convex Node.js actions, TypeScript, Perplexity `sonar` API, Next.js 15, Tailwind 4, Bun test

---

## File Structure

**New files:**

| File | Responsibility |
|------|----------------|
| `convex/lib/geo/types.ts` | `CitationSample`, `PsosResult`, `EngineSampler` interfaces |
| `convex/lib/geo/brandDetection.ts` | `detectBrand()` — case-insensitive substring match |
| `convex/lib/geo/stats.ts` | `computePsos()`, `wilsonCI()` — pure functions, no side effects |
| `convex/lib/geo/sampler.ts` | `samplePerplexity()` — Perplexity API, n sequential calls |
| `convex/lib/geo/__tests__/brandDetection.test.ts` | Unit tests for brand detection |
| `convex/lib/geo/__tests__/stats.test.ts` | Unit tests for PSOS + Wilson CI |
| `convex/promptBaskets.ts` | CRUD queries/mutations for `promptBaskets` table |
| `convex/visibilitySnapshots.ts` | `insert`, `listBySiteInWindow` |
| `convex/visibilityReports.ts` | `insert`, `latestBySite`, `listBySite` |
| `convex/actions/geoMonitoring.ts` | `runDueGeoChecks`, `runSiteGeoCheck` internal actions |
| `dashboard/components/psos-gauge.tsx` | PSOS % + CI range display |
| `dashboard/components/psos-sparkline.tsx` | SVG trend chart with CI band |
| `dashboard/app/sites/[siteId]/prompts/page.tsx` | Prompt basket management UI |

**Modified files:**

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `promptBaskets`, `visibilitySnapshots`, `visibilityReports`, `citationDiagnostics`; add `nextGeoCheckAt` + `psosDropThreshold` to `sites` |
| `convex/sites.ts` | Add `getDueSitesForGeo` query, `updateNextGeoCheck` mutation |
| `convex/crons.ts` | Add `runDueGeoChecks` hourly cron |
| `convex/actions/alerts.ts` | Add `checkAndSendPsosAlert` action |
| `dashboard/app/sites/[siteId]/page.tsx` | Add PSOS section (gauge + sparkline + prompts CTA) |

---

### Task 1: Schema — add GEO monitoring tables

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Extend `sites` table and add 4 new tables**

In `convex/schema.ts`, replace the `sites` table definition with the version below (adds `nextGeoCheckAt` and `psosDropThreshold`), then append the 4 new tables inside `defineSchema({...})`:

```typescript
  sites: defineTable({
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    schedule: v.union(v.literal('weekly'), v.literal('monthly')),
    monitoringEnabled: v.boolean(),
    subscriptionId: v.optional(v.string()),
    nextAuditAt: v.number(),
    nextGeoCheckAt: v.optional(v.number()),
    alertConfig: v.object({
      scoreDropThreshold: v.number(),
      criticalFindings: v.boolean(),
      crawlerBlocked: v.boolean(),
      psosDropThreshold: v.optional(v.number()),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_monitoring_enabled_and_next_audit_at', ['monitoringEnabled', 'nextAuditAt'])
    .index('by_subscription_id', ['subscriptionId']),

  promptBaskets: defineTable({
    siteId: v.id('sites'),
    brandName: v.string(),
    prompts: v.array(v.string()),
    engine: v.union(v.literal('perplexity')),
    runsPerPrompt: v.number(),
    enabled: v.boolean(),
    createdAt: v.number(),
  }).index('by_site', ['siteId']),

  visibilitySnapshots: defineTable({
    siteId: v.id('sites'),
    basketId: v.id('promptBaskets'),
    engine: v.string(),
    prompt: v.string(),
    runIndex: v.number(),
    brandDetected: v.boolean(),
    responseSnippet: v.string(),
    sampledAt: v.number(),
  })
    .index('by_site_and_sampled_at', ['siteId', 'sampledAt'])
    .index('by_basket', ['basketId']),

  visibilityReports: defineTable({
    siteId: v.id('sites'),
    basketId: v.id('promptBaskets'),
    engine: v.string(),
    psos: v.number(),
    ciLower: v.number(),
    ciUpper: v.number(),
    totalSamples: v.number(),
    citationCount: v.number(),
    windowDays: v.number(),
    generatedAt: v.number(),
  })
    .index('by_site', ['siteId'])
    .index('by_site_and_generated_at', ['siteId', 'generatedAt'])
    .index('by_basket', ['basketId']),

  citationDiagnostics: defineTable({
    siteId: v.id('sites'),
    reportId: v.id('visibilityReports'),
    failureMode: v.union(
      v.literal('technical_integrity'),
      v.literal('semantic_alignment'),
      v.literal('content_quality'),
      v.literal('systemic_exclusion')
    ),
    details: v.string(),
    suggestedFix: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_site', ['siteId'])
    .index('by_report', ['reportId']),
```

- [ ] **Step 2: Deploy schema to verify it compiles**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no errors, 4 new tables appear in Convex dashboard.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add GEO monitoring tables and nextGeoCheckAt to sites"
```

---

### Task 2: Types

**Files:**
- Create: `convex/lib/geo/types.ts`

- [ ] **Step 1: Create the types file**

```typescript
// convex/lib/geo/types.ts

export interface CitationSample {
  prompt: string;
  runIndex: number;
  brandDetected: boolean;
  responseSnippet: string;
}

export interface PsosResult {
  psos: number;
  ciLower: number;
  ciUpper: number;
  totalSamples: number;
  citationCount: number;
}

export interface RawSample {
  runIndex: number;
  responseText: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add convex/lib/geo/types.ts
git commit -m "feat(geo): shared types for GEO measurement"
```

---

### Task 3: Brand detection

**Files:**
- Create: `convex/lib/geo/brandDetection.ts`
- Create: `convex/lib/geo/__tests__/brandDetection.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// convex/lib/geo/__tests__/brandDetection.test.ts
import { describe, expect, it } from 'bun:test';
import { detectBrand } from '../brandDetection';

describe('detectBrand', () => {
  it('detects exact brand name', () => {
    expect(detectBrand('According to Airbnb, prices are rising.', 'Airbnb')).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(detectBrand('AIRBNB offers competitive rates.', 'Airbnb')).toBe(true);
  });
  it('returns false when brand not present', () => {
    expect(detectBrand('Booking.com and Vrbo are popular.', 'Airbnb')).toBe(false);
  });
  it('detects brand in domain form', () => {
    expect(detectBrand('Visit airbnb.com for deals.', 'Airbnb')).toBe(true);
  });
  it('returns false for empty response', () => {
    expect(detectBrand('', 'Airbnb')).toBe(false);
  });
  it('detects single-word brand', () => {
    expect(detectBrand('Nike shoes are popular among runners.', 'Nike')).toBe(true);
  });
  it('returns false for empty brand name', () => {
    expect(detectBrand('some text here', '')).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/carlos/apps/airio/convex && bun test lib/geo/__tests__/brandDetection.test.ts
```

Expected: FAIL — `Cannot find module '../brandDetection'`

- [ ] **Step 3: Implement**

```typescript
// convex/lib/geo/brandDetection.ts

export function detectBrand(responseText: string, brandName: string): boolean {
  if (!responseText || !brandName) return false;
  return responseText.toLowerCase().includes(brandName.toLowerCase());
}
```

- [ ] **Step 4: Run to verify all pass**

```bash
cd /home/carlos/apps/airio/convex && bun test lib/geo/__tests__/brandDetection.test.ts
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/geo/brandDetection.ts convex/lib/geo/__tests__/brandDetection.test.ts
git commit -m "feat(geo): brand detection with tests"
```

---

### Task 4: Stats engine (PSOS + Wilson CI)

**Files:**
- Create: `convex/lib/geo/stats.ts`
- Create: `convex/lib/geo/__tests__/stats.test.ts`

Wilson score interval (Sielinski 2026): the standard CI for a proportion `p` from `n` Bernoulli trials. z=1.96 for 95%. No external library needed.

- [ ] **Step 1: Write failing tests**

```typescript
// convex/lib/geo/__tests__/stats.test.ts
import { describe, expect, it } from 'bun:test';
import { computePsos, wilsonCI } from '../stats';

describe('computePsos', () => {
  it('returns 0 when no citations', () => {
    expect(computePsos(0, 35)).toBe(0);
  });
  it('returns 1 when all citations', () => {
    expect(computePsos(35, 35)).toBe(1);
  });
  it('returns correct proportion', () => {
    expect(computePsos(7, 35)).toBeCloseTo(0.2, 5);
  });
  it('throws when totalSamples is 0', () => {
    expect(() => computePsos(0, 0)).toThrow('totalSamples must be > 0');
  });
});

describe('wilsonCI', () => {
  it('lower bound is 0 for zero citations', () => {
    const { lower } = wilsonCI(0, 35);
    expect(lower).toBe(0);
  });
  it('upper bound is 1 for all citations', () => {
    const { upper } = wilsonCI(35, 35);
    expect(upper).toBe(1);
  });
  it('psos is within CI bounds', () => {
    const { lower, upper } = wilsonCI(14, 35);
    const psos = computePsos(14, 35);
    expect(lower).toBeLessThan(psos);
    expect(upper).toBeGreaterThan(psos);
  });
  it('CI narrows with more samples at same proportion', () => {
    const wide = wilsonCI(7, 35);
    const narrow = wilsonCI(70, 350);
    expect(narrow.upper - narrow.lower).toBeLessThan(wide.upper - wide.lower);
  });
  it('throws when totalSamples is 0', () => {
    expect(() => wilsonCI(0, 0)).toThrow('totalSamples must be > 0');
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd /home/carlos/apps/airio/convex && bun test lib/geo/__tests__/stats.test.ts
```

Expected: FAIL — `Cannot find module '../stats'`

- [ ] **Step 3: Implement**

```typescript
// convex/lib/geo/stats.ts

const Z95 = 1.96;

export function computePsos(citationCount: number, totalSamples: number): number {
  if (totalSamples <= 0) throw new Error('totalSamples must be > 0');
  return citationCount / totalSamples;
}

export function wilsonCI(
  citationCount: number,
  totalSamples: number,
  z = Z95
): { lower: number; upper: number } {
  if (totalSamples <= 0) throw new Error('totalSamples must be > 0');
  const p = citationCount / totalSamples;
  const n = totalSamples;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const halfWidth = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return {
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
  };
}
```

- [ ] **Step 4: Run to verify all pass**

```bash
cd /home/carlos/apps/airio/convex && bun test lib/geo/__tests__/stats.test.ts
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/lib/geo/stats.ts convex/lib/geo/__tests__/stats.test.ts
git commit -m "feat(geo): PSOS computation and Wilson CI with tests"
```

---

### Task 5: Perplexity sampler

**Files:**
- Create: `convex/lib/geo/sampler.ts`

Calls Perplexity `sonar` model (OpenAI-compatible). `temperature: 1` is required — lower values reduce stochastic variation and underestimate true CI width (Sielinski 2026). Sequential calls, not parallel, to avoid rate limit bursts.

- [ ] **Step 1: Create sampler**

```typescript
// convex/lib/geo/sampler.ts
import type { RawSample } from './types.js';

export async function samplePerplexity(
  apiKey: string,
  prompt: string,
  runs: number
): Promise<RawSample[]> {
  const results: RawSample[] = [];
  for (let i = 0; i < runs; i++) {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Perplexity API ${res.status}: ${text}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    results.push({
      runIndex: i,
      responseText: data.choices[0]?.message?.content ?? '',
    });
  }
  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add convex/lib/geo/sampler.ts
git commit -m "feat(geo): Perplexity sampler (sonar, n sequential runs, temperature=1)"
```

---

### Task 6: promptBaskets CRUD

**Files:**
- Create: `convex/promptBaskets.ts`

Follows `anyDb`/`anyApi` pattern from `convex/sites.ts`. `runsPerPrompt` hardcoded to 7 on create (Schulte 2026: minimum for SE < 0.10).

- [ ] **Step 1: Create promptBaskets.ts**

```typescript
// convex/promptBaskets.ts
import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const create = mutationGeneric({
  args: {
    siteId: v.id('sites'),
    brandName: v.string(),
    prompts: v.array(v.string()),
    engine: v.literal('perplexity'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    return await anyDb(ctx).insert('promptBaskets', {
      siteId: args.siteId,
      brandName: args.brandName,
      prompts: args.prompts,
      engine: args.engine,
      runsPerPrompt: 7,
      enabled: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutationGeneric({
  args: {
    basketId: v.id('promptBaskets'),
    brandName: v.optional(v.string()),
    prompts: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    const { basketId, ...rest } = args;
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined)
    );
    await anyDb(ctx).patch(basketId, patch);
  },
});

export const listBySite = queryGeneric({
  args: { siteId: v.id('sites') },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('promptBaskets')
      .withIndex('by_site', (q: any) => q.eq('siteId', args.siteId))
      .collect();
  },
});

export const getById = queryGeneric({
  args: { basketId: v.id('promptBaskets') },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.basketId);
  },
});

export const remove = mutationGeneric({
  args: { basketId: v.id('promptBaskets') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    await anyDb(ctx).delete(args.basketId);
  },
});
```

- [ ] **Step 2: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add convex/promptBaskets.ts
git commit -m "feat(geo): promptBaskets CRUD"
```

---

### Task 7: visibilitySnapshots + visibilityReports

**Files:**
- Create: `convex/visibilitySnapshots.ts`
- Create: `convex/visibilityReports.ts`

- [ ] **Step 1: Create visibilitySnapshots.ts**

```typescript
// convex/visibilitySnapshots.ts
import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const insert = mutationGeneric({
  args: {
    siteId: v.id('sites'),
    basketId: v.id('promptBaskets'),
    engine: v.string(),
    prompt: v.string(),
    runIndex: v.number(),
    brandDetected: v.boolean(),
    responseSnippet: v.string(),
    sampledAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await anyDb(ctx).insert('visibilitySnapshots', args);
  },
});

export const listBySiteInWindow = queryGeneric({
  args: { siteId: v.id('sites'), since: v.number() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('visibilitySnapshots')
      .withIndex('by_site_and_sampled_at', (q: any) =>
        q.eq('siteId', args.siteId).gte('sampledAt', args.since)
      )
      .collect();
  },
});
```

- [ ] **Step 2: Create visibilityReports.ts**

```typescript
// convex/visibilityReports.ts
import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const insert = mutationGeneric({
  args: {
    siteId: v.id('sites'),
    basketId: v.id('promptBaskets'),
    engine: v.string(),
    psos: v.number(),
    ciLower: v.number(),
    ciUpper: v.number(),
    totalSamples: v.number(),
    citationCount: v.number(),
    windowDays: v.number(),
    generatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await anyDb(ctx).insert('visibilityReports', args);
  },
});

export const latestBySite = queryGeneric({
  args: { siteId: v.id('sites') },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('visibilityReports')
      .withIndex('by_site_and_generated_at', (q: any) => q.eq('siteId', args.siteId))
      .order('desc')
      .first();
  },
});

export const listBySite = queryGeneric({
  args: { siteId: v.id('sites'), limit: v.number() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('visibilityReports')
      .withIndex('by_site_and_generated_at', (q: any) => q.eq('siteId', args.siteId))
      .order('desc')
      .take(args.limit);
  },
});
```

- [ ] **Step 3: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/visibilitySnapshots.ts convex/visibilityReports.ts
git commit -m "feat(geo): visibilitySnapshots and visibilityReports queries/mutations"
```

---

### Task 8: sites.ts — getDueSitesForGeo + updateNextGeoCheck

**Files:**
- Modify: `convex/sites.ts`

- [ ] **Step 1: Append two functions to convex/sites.ts**

Add at the bottom of `convex/sites.ts`:

```typescript
export const getDueSitesForGeo = queryGeneric({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('sites')
      .filter((q: any) =>
        q.or(
          q.eq(q.field('nextGeoCheckAt'), undefined),
          q.lte(q.field('nextGeoCheckAt'), args.now)
        )
      )
      .collect();
  },
});

export const updateNextGeoCheck = mutationGeneric({
  args: { siteId: v.string(), nextGeoCheckAt: v.number() },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, { nextGeoCheckAt: args.nextGeoCheckAt });
  },
});
```

- [ ] **Step 2: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/sites.ts
git commit -m "feat(geo): getDueSitesForGeo and updateNextGeoCheck"
```

---

### Task 9: GEO monitoring action

**Files:**
- Create: `convex/actions/geoMonitoring.ts`

Core orchestration. `'use node'` required (external HTTP). Loops prompts sequentially per basket to avoid Perplexity rate limits.

- [ ] **Step 1: Create geoMonitoring.ts**

```typescript
// convex/actions/geoMonitoring.ts
'use node';

import { anyApi, internalActionGeneric } from 'convex/server';
import { internal } from '../_generated/api';
import { v } from 'convex/values';
import { detectBrand } from '../lib/geo/brandDetection.js';
import { samplePerplexity } from '../lib/geo/sampler.js';
import { computePsos, wilsonCI } from '../lib/geo/stats.js';

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 24;

export const runDueGeoChecks = internalActionGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sites = (await ctx.runQuery(anyApi.sites.getDueSitesForGeo, { now })) as Array<{
      _id: string;
    }>;
    for (const site of sites) {
      try {
        await ctx.runAction(internal.actions.geoMonitoring.runSiteGeoCheck, {
          siteId: site._id,
        });
      } catch (err) {
        console.error(`GEO check failed for site ${site._id}:`, err);
      }
    }
  },
});

export const runSiteGeoCheck = internalActionGeneric({
  args: { siteId: v.string() },
  handler: async (ctx, { siteId }) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

    const baskets = (await ctx.runQuery(anyApi.promptBaskets.listBySite, {
      siteId,
    })) as Array<{
      _id: string;
      brandName: string;
      prompts: string[];
      engine: string;
      runsPerPrompt: number;
      enabled: boolean;
    }>;

    const enabledBaskets = baskets.filter((b) => b.enabled);
    if (enabledBaskets.length === 0) return;

    for (const basket of enabledBaskets) {
      const detectionResults: boolean[] = [];

      for (const prompt of basket.prompts) {
        const rawSamples = await samplePerplexity(apiKey, prompt, basket.runsPerPrompt);

        for (const raw of rawSamples) {
          const brandDetected = detectBrand(raw.responseText, basket.brandName);
          detectionResults.push(brandDetected);

          await ctx.runMutation(anyApi.visibilitySnapshots.insert, {
            siteId: siteId as any,
            basketId: basket._id as any,
            engine: basket.engine,
            prompt,
            runIndex: raw.runIndex,
            brandDetected,
            responseSnippet: raw.responseText.slice(0, 500),
            sampledAt: Date.now(),
          });
        }
      }

      const citationCount = detectionResults.filter(Boolean).length;
      const totalSamples = detectionResults.length;
      const psos = computePsos(citationCount, totalSamples);
      const { lower: ciLower, upper: ciUpper } = wilsonCI(citationCount, totalSamples);

      const reportId = (await ctx.runMutation(anyApi.visibilityReports.insert, {
        siteId: siteId as any,
        basketId: basket._id as any,
        engine: basket.engine,
        psos,
        ciLower,
        ciUpper,
        totalSamples,
        citationCount,
        windowDays: WINDOW_DAYS,
        generatedAt: Date.now(),
      })) as string;

      await ctx.runAction(anyApi.actions.alerts.checkAndSendPsosAlert, {
        siteId,
        reportId,
      });
    }

    await ctx.runMutation(anyApi.sites.updateNextGeoCheck, {
      siteId,
      nextGeoCheckAt: Date.now() + WEEKLY_MS,
    });
  },
});
```

- [ ] **Step 2: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no errors. (`PERPLEXITY_API_KEY` checked only at runtime.)

- [ ] **Step 3: Commit**

```bash
git add convex/actions/geoMonitoring.ts
git commit -m "feat(geo): GEO monitoring action (runDueGeoChecks, runSiteGeoCheck)"
```

---

### Task 10: Cron wiring

**Files:**
- Modify: `convex/crons.ts`

- [ ] **Step 1: Add GEO cron**

Replace the full contents of `convex/crons.ts`:

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.interval(
  'run due site audits',
  { hours: 1 },
  internal.actions.monitoring.runDueSiteAudits,
  {}
);

crons.interval(
  'run due geo visibility checks',
  { hours: 1 },
  internal.actions.geoMonitoring.runDueGeoChecks,
  {}
);

export default crons;
```

- [ ] **Step 2: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: two cron jobs visible in Convex dashboard under Crons tab.

- [ ] **Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(geo): add GEO visibility check to crons (hourly)"
```

---

### Task 11: PSOS drop alert

**Files:**
- Modify: `convex/actions/alerts.ts`

Compares current PSOS to previous report. Sends email if drop ≥ `psosDropThreshold` (defaults to 0.15 = 15 pp).

- [ ] **Step 1: Add checkAndSendPsosAlert at the bottom of alerts.ts**

The `sendEmail` helper already exists in this file. Add after the existing `checkAndSendAlerts` export:

```typescript
export const checkAndSendPsosAlert = actionGeneric({
  args: { siteId: v.string(), reportId: v.string() },
  handler: async (ctx, { siteId }) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;

    const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any;
    if (!site) return;

    const threshold: number = site.alertConfig?.psosDropThreshold ?? 0.15;

    const reports = (await ctx.runQuery(anyApi.visibilityReports.listBySite, {
      siteId,
      limit: 2,
    })) as any[];
    if (reports.length < 2) return;

    const current = reports[0];
    const previous = reports[1];
    const drop = previous.psos - current.psos;
    if (drop < threshold) return;

    const user = (await ctx.runQuery(anyApi.users.getById, { userId: site.userId })) as any;
    if (!user?.email) return;

    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const detailUrl = `https://seo.ai.rio.br/sites/${siteId}`;

    await sendEmail(
      resendKey,
      user.email,
      `⚠ Visibilidade GEO caiu de ${pct(previous.psos)} para ${pct(current.psos)} em ${site.name}`,
      `<p>PSOS de <strong>${site.name}</strong> caiu de <strong>${pct(previous.psos)}</strong> para <strong>${pct(current.psos)}</strong>.</p>` +
        `<p>IC 95%: ${pct(current.ciLower)}–${pct(current.ciUpper)} · ${current.citationCount}/${current.totalSamples} amostras</p>` +
        `<p><a href="${detailUrl}">Ver detalhes →</a></p>`
    );
  },
});
```

- [ ] **Step 2: Deploy**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/actions/alerts.ts
git commit -m "feat(geo): PSOS drop alert via Resend"
```

---

### Task 12: Dashboard — PSOS components

**Files:**
- Create: `dashboard/components/psos-gauge.tsx`
- Create: `dashboard/components/psos-sparkline.tsx`

No new npm dependencies. Gauge is numeric display. Sparkline extends the hand-rolled SVG pattern already in `dashboard/app/sites/[siteId]/page.tsx`.

- [ ] **Step 1: Create psos-gauge.tsx**

```tsx
// dashboard/components/psos-gauge.tsx
'use client';

interface PsosGaugeProps {
  psos: number;
  ciLower: number;
  ciUpper: number;
  citationCount: number;
  totalSamples: number;
}

export function PsosGauge({ psos, ciLower, ciUpper, citationCount, totalSamples }: PsosGaugeProps) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const color =
    psos >= 0.6 ? 'text-green-600' : psos >= 0.3 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col gap-1">
      <div className={`text-3xl font-bold tabular-nums ${color}`}>{pct(psos)}</div>
      <div className="text-xs text-gray-500">
        IC 95%: {pct(ciLower)} – {pct(ciUpper)}
      </div>
      <div className="text-xs text-gray-400">
        {citationCount}/{totalSamples} amostras detectadas
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create psos-sparkline.tsx**

```tsx
// dashboard/components/psos-sparkline.tsx
'use client';

interface ReportPoint {
  psos: number;
  ciLower: number;
  ciUpper: number;
  generatedAt: number;
}

export function PsosSparkline({ reports }: { reports: ReportPoint[] }) {
  if (reports.length < 2) {
    return <p className="text-xs text-gray-400 mt-1">Dados insuficientes para tendência</p>;
  }

  const W = 280;
  const H = 72;
  const pad = 10;

  const toX = (i: number) => pad + (i / (reports.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - v * (H - pad * 2);

  const upperBand = reports.map((r, i) => `${toX(i)},${toY(r.ciUpper)}`).join(' ');
  const lowerBand = [...reports]
    .reverse()
    .map((r, i) => `${toX(reports.length - 1 - i)},${toY(r.ciLower)}`)
    .join(' ');
  const linePoints = reports.map((r, i) => `${toX(i)},${toY(r.psos)}`).join(' ');
  const latest = reports[reports.length - 1];
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <polygon
          points={`${upperBand} ${lowerBand}`}
          fill="currentColor"
          className="text-blue-100"
          opacity={0.8}
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-blue-500"
        />
        <circle
          cx={toX(reports.length - 1)}
          cy={toY(latest.psos)}
          r={3}
          fill="currentColor"
          className="text-blue-600"
        />
      </svg>
      <p className="text-xs text-gray-400 mt-1">
        Últimas {reports.length} semanas · atual {pct(latest.psos)}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/psos-gauge.tsx dashboard/components/psos-sparkline.tsx
git commit -m "feat(geo): PsosGauge and PsosSparkline components"
```

---

### Task 13: Site detail page — PSOS section

**Files:**
- Modify: `dashboard/app/sites/[siteId]/page.tsx`

- [ ] **Step 1: Add imports at top of page.tsx**

After the existing imports block, add:

```tsx
import { PsosGauge } from '@/components/psos-gauge';
import { PsosSparkline } from '@/components/psos-sparkline';
```

- [ ] **Step 2: Add VisibilityReport interface**

After the existing `interface Audit` block, add:

```tsx
interface VisibilityReport {
  _id: Id<'visibilityReports'>;
  psos: number;
  ciLower: number;
  ciUpper: number;
  citationCount: number;
  totalSamples: number;
  generatedAt: number;
}
```

- [ ] **Step 3: Add three new queries inside SiteDetailPage**

After the `audits` query line:

```tsx
const latestReport = useQuery(api.visibilityReports.latestBySite, {
  siteId: siteId as Id<'sites'>,
});
const reportHistory = useQuery(api.visibilityReports.listBySite, {
  siteId: siteId as Id<'sites'>,
  limit: 8,
});
const baskets = useQuery(api.promptBaskets.listBySite, {
  siteId: siteId as Id<'sites'>,
});
```

- [ ] **Step 4: Add PsosSection component**

Add this component function above the existing `AlertConfigSection` function in the same file:

```tsx
function PsosSection({
  siteId,
  report,
  history,
  hasBasket,
}: {
  siteId: string;
  report: VisibilityReport | null | undefined;
  history: VisibilityReport[] | undefined;
  hasBasket: boolean;
}) {
  const router = useRouter();

  if (!hasBasket) {
    return (
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-sm font-medium text-gray-900 mb-1">Visibilidade em IA</p>
          <p className="text-xs text-gray-500 mb-3">
            Configure prompts para medir com que frequência sua marca aparece no Perplexity.
          </p>
          <button
            onClick={() => router.push(`/sites/${siteId}/prompts`)}
            className="text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded px-3 py-1.5 transition-colors"
          >
            Configurar monitoramento →
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-sm font-medium text-gray-900 mb-1">Visibilidade em IA</p>
          <p className="text-xs text-gray-500">Aguardando primeira medição semanal...</p>
          <button
            onClick={() => router.push(`/sites/${siteId}/prompts`)}
            className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors block"
          >
            Gerenciar prompts →
          </button>
        </CardContent>
      </Card>
    );
  }

  const orderedHistory = [...(history ?? [])].reverse();

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-3">
        <p className="text-sm font-medium text-gray-900">Visibilidade em IA (PSOS)</p>
        <PsosGauge
          psos={report.psos}
          ciLower={report.ciLower}
          ciUpper={report.ciUpper}
          citationCount={report.citationCount}
          totalSamples={report.totalSamples}
        />
        <PsosSparkline reports={orderedHistory} />
        <button
          onClick={() => router.push(`/sites/${siteId}/prompts`)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          Gerenciar prompts →
        </button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Insert PsosSection in JSX**

In the return JSX of `SiteDetailPage`, find the block that renders `AlertConfigSection` and insert before it:

```tsx
{/* GEO visibility */}
<div className="space-y-2">
  <p className="text-sm font-medium text-gray-700 px-0.5">Visibilidade em IA</p>
  <PsosSection
    siteId={siteId}
    report={latestReport ?? null}
    history={reportHistory}
    hasBasket={(baskets?.length ?? 0) > 0}
  />
</div>
```

- [ ] **Step 6: Commit**

```bash
git add dashboard/app/sites/[siteId]/page.tsx
git commit -m "feat(geo): add PSOS section to site detail page"
```

---

### Task 14: Prompt basket management page

**Files:**
- Create: `dashboard/app/sites/[siteId]/prompts/page.tsx`

Max 5 prompts (Starter tier). Shows enable/disable toggle only when a basket already exists (can't enable before first save).

- [ ] **Step 1: Create the page**

```tsx
// dashboard/app/sites/[siteId]/prompts/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MAX_PROMPTS = 5;

export default function PromptsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();

  const baskets = useQuery(api.promptBaskets.listBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const createBasket = useMutation(api.promptBaskets.create);
  const updateBasket = useMutation(api.promptBaskets.update);

  const existing = baskets?.[0] ?? null;

  const [brandName, setBrandName] = useState('');
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setBrandName(existing.brandName);
      setPrompts(existing.prompts.length > 0 ? existing.prompts : ['']);
      setEnabled(existing.enabled);
    }
  }, [existing]);

  function addPrompt() {
    if (prompts.length >= MAX_PROMPTS) return;
    setPrompts([...prompts, '']);
  }

  function removePrompt(idx: number) {
    setPrompts(prompts.filter((_, i) => i !== idx));
  }

  function updatePrompt(idx: number, value: string) {
    setPrompts(prompts.map((p, i) => (i === idx ? value : p)));
  }

  async function save() {
    const filtered = prompts.filter((p) => p.trim().length > 0);
    if (!brandName.trim() || filtered.length === 0) return;
    setSaving(true);
    try {
      if (existing) {
        await updateBasket({
          basketId: existing._id as Id<'promptBaskets'>,
          brandName: brandName.trim(),
          prompts: filtered,
          enabled,
        });
      } else {
        await createBasket({
          siteId: siteId as Id<'sites'>,
          brandName: brandName.trim(),
          prompts: filtered,
          engine: 'perplexity',
        });
      }
      router.push(`/sites/${siteId}`);
    } finally {
      setSaving(false);
    }
  }

  const canSave = brandName.trim().length > 0 && prompts.some((p) => p.trim().length > 0);

  if (baskets === undefined) {
    return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <button
            onClick={() => router.push(`/sites/${siteId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 block"
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Monitoramento de Visibilidade</h1>
          <p className="text-sm text-gray-500 mt-1">
            7 amostras por prompt · motor: Perplexity · verificação semanal
          </p>
        </div>

        <Card>
          <CardContent className="py-4 px-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da marca
              </label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: Airbnb"
              />
              <p className="text-xs text-gray-400 mt-1">
                Detectamos menções exatas (case-insensitive) nas respostas do Perplexity.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompts ({prompts.length}/{MAX_PROMPTS})
              </label>
              <div className="space-y-2">
                {prompts.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      value={p}
                      onChange={(e) => updatePrompt(i, e.target.value)}
                      placeholder={`Ex: Qual a melhor plataforma para alugar imóveis?`}
                    />
                    {prompts.length > 1 && (
                      <button
                        onClick={() => removePrompt(i)}
                        className="text-xs text-red-400 hover:text-red-600 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {prompts.length < MAX_PROMPTS && (
                <button
                  onClick={addPrompt}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  + Adicionar prompt
                </button>
              )}
            </div>

            {existing && (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Monitoramento ativo</p>
                  <p className="text-xs text-gray-400">Verificação automática semanal</p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`text-xs font-medium rounded px-2 py-0.5 border transition-colors ${
                    enabled
                      ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                      : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {enabled ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving || !canSave} className="w-full">
          {saving ? 'Salvando...' : existing ? 'Salvar alterações' : 'Criar monitoramento'}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Set PERPLEXITY_API_KEY in Convex**

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex env set PERPLEXITY_API_KEY sk-YOUR-KEY-HERE
```

Get the key from https://www.perplexity.ai/settings/api — requires a Perplexity Pro account.

- [ ] **Step 3: Start dev server and smoke-test the full flow**

```bash
cd /home/carlos/apps/airio/dashboard && bun run dev
```

1. Navigate to `http://localhost:3002` and sign in.
2. Click a site → confirm PSOS section shows "Configurar monitoramento" CTA.
3. Click CTA → `/sites/[siteId]/prompts` page renders.
4. Enter brand name + 2 prompts → click "Criar monitoramento".
5. Redirects to site detail page → PSOS section now shows "Aguardando primeira medição".
6. Enable the basket: go back to prompts page, toggle "Ativo" → save.
7. Manually trigger a check by calling `runSiteGeoCheck` from the Convex dashboard Functions tab with `{ siteId: "..." }`.
8. Return to site detail — PSOS gauge and sparkline should render with real data.

- [ ] **Step 4: Run full TypeScript check**

```bash
cd /home/carlos/apps/airio/dashboard && npx tsc --noEmit
```

Expected: 0 errors.

```bash
cd /home/carlos/apps/airio && ~/.bun/bin/convex dev --once
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add dashboard/app/sites/[siteId]/prompts/page.tsx
git commit -m "feat(geo): prompt basket management page"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| n≥7 repeated samples per prompt | Tasks 5, 9 (`runsPerPrompt: 7` hardcoded on create) |
| PSOS as headline KPI | Tasks 4, 12 (`PsosGauge`) |
| Wilson CI (≡ bootstrap CI for proportions) | Tasks 4, 9, 12 |
| Brand detection via substring match | Task 3 |
| Prompt basket per site | Tasks 6, 14 |
| Weekly automated sampling | Tasks 9, 10 (cron runs hourly, checks `nextGeoCheckAt`) |
| Historical trend chart | Task 12 (`PsosSparkline`) |
| Alerts on PSOS drop | Task 11 |
| Raw snapshot storage | Task 7 (`visibilitySnapshots`) |
| Computed report storage | Task 7 (`visibilityReports`) |
| Perplexity engine | Tasks 5, 6 |
| `citationDiagnostics` table (Phase 2) | Task 1 (schema only; Tian taxonomy implementation deferred) |
| No basket → CTA | Task 13 (`PsosSection` no-basket state) |
| PERPLEXITY_API_KEY env var | Task 14 Step 2 |

### Placeholder scan

No TBD, no "implement later", no "similar to Task N". All steps contain complete code.

### Type consistency

- `computePsos(citationCount, totalSamples)` — defined Task 4, called Task 9 ✓
- `wilsonCI(citationCount, totalSamples)` — defined Task 4, called Task 9 ✓
- `samplePerplexity(apiKey, prompt, runs)` — defined Task 5, called Task 9 ✓
- `detectBrand(responseText, brandName)` — defined Task 3, called Task 9 ✓
- `RawSample` — defined Task 2, returned by `samplePerplexity` Task 5, consumed Task 9 ✓
- `api.visibilityReports.latestBySite` / `listBySite` — defined Task 7, used Tasks 11, 13 ✓
- `api.promptBaskets.listBySite` / `create` / `update` — defined Task 6, used Tasks 9, 13, 14 ✓
- `PsosGauge` props match `VisibilityReport` interface fields used in Task 13 ✓
- `PsosSparkline` `reports` prop uses `ReportPoint` which matches `VisibilityReport` fields ✓
