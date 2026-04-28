# airio Monitoring Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform airio from one-time audit tool into ongoing AEO monitoring platform with per-site subscriptions, score history, shareable reports, and alert notifications.

**Architecture:** Sites-first — new `sites` table as the central entity. All monitored audits link back to a site via `siteId`. Convex cron runs hourly, triggers `runAudit` for due sites, then `checkAndSendAlerts` compares the two most recent audits and sends Resend emails on score drops, new critical findings, or newly blocked crawlers.

**Tech Stack:** Convex (DB/mutations/queries/actions/crons), Next.js 15 App Router, Tailwind 4, Resend (transactional email), DodoPayments (recurring subscriptions)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `convex/sites.ts` | CRUD: list, get, create, updateAlertConfig, updateNextAudit, setMonitoringEnabled, getDueSites, getBySubscriptionId |
| `convex/shareableReports.ts` | create (returns token, idempotent), getByToken (joins audit + site) |
| `convex/crons.ts` | Hourly cron → `runDueSiteAudits` |
| `convex/actions/monitoring.ts` | `runDueSiteAudits`: query due sites, call `runAudit` for each |
| `convex/actions/alerts.ts` | `checkAndSendAlerts`: compare last 2 audits, send Resend emails |
| `dashboard/app/sites/[siteId]/page.tsx` | Site detail: score history chart, findings, alert toggles, share button |
| `dashboard/app/report/[token]/page.tsx` | Public shareable report — no auth required |

### Modified files
| File | Change |
|---|---|
| `convex/schema.ts` | Add `sites`, `shareable_reports` tables; add `siteId` to `audits` |
| `convex/audits.ts` | `createPending` accepts `siteId`; add `listBySite` query |
| `convex/users.ts` | Add `getById` query (needed by alerts) |
| `convex/actions/audit.ts` | Accept optional `siteId` arg; update `nextAuditAt` and trigger alerts post-complete |
| `convex/actions/webhook.ts` | Add `subscription.activated / cancelled / past_due` handlers |
| `dashboard/app/_page-client.tsx` | Fix dev bypass audit history; add sites list section |

---

## Task 1: Fix dev bypass — audit history not showing

**Files:**
- Modify: `convex/audits.ts`
- Modify: `dashboard/app/_page-client.tsx`

**Problem:** When dev bypass is active, `convexAuth` is `false` so `listByUser` is called with `'skip'`. Audits exist in DB under `dev@localhost` user but never displayed.

- [ ] **Step 1: Update `listByUser` to support dev mode**

In `convex/audits.ts`, replace the `listByUser` export:

```typescript
export const listByUser = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    let userId: string

    if (identity) {
      userId = identity.subject.split('|')[0]
    } else if (
      process.env.AUTH_EMAIL_MOCK === '1' ||
      process.env.CONVEX_DEPLOYMENT?.startsWith('dev:')
    ) {
      const devUser = await anyDb(ctx)
        .query('users')
        .withIndex('email', (q: any) => q.eq('email', 'dev@localhost'))
        .unique()
      if (!devUser) return []
      userId = devUser._id
    } else {
      return []
    }

    return await anyDb(ctx)
      .query('audits')
      .withIndex('by_user_and_created', (q: any) => q.eq('userId', userId))
      .order('desc')
      .take(50)
  },
})
```

- [ ] **Step 2: Update `_page-client.tsx` to query audits in dev bypass mode**

In `dashboard/app/_page-client.tsx`, change line 94:

```typescript
// Before:
const audits = useQuery(api.audits.listByUser, convexAuth ? {} : 'skip');
// After:
const audits = useQuery(api.audits.listByUser, isAuthenticated ? {} : 'skip');
```

- [ ] **Step 3: Verify**

1. Visit `http://localhost:3002/dev` to set the dev bypass cookie
2. Run an audit
3. Navigate to `/` — audit should appear in the list

- [ ] **Step 4: Commit**

```bash
git add convex/audits.ts dashboard/app/_page-client.tsx
git commit -m "fix: show audit history for dev bypass users"
```

---

## Task 2: Schema — add sites, shareable_reports, siteId

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Add `sites` and `shareable_reports` tables, and `siteId` to `audits`**

In `convex/schema.ts`, inside `defineSchema({...})`, add before the closing `})`:

```typescript
  sites: defineTable({
    userId: v.string(),
    url: v.string(),
    name: v.string(),
    schedule: v.union(v.literal('weekly'), v.literal('monthly')),
    monitoringEnabled: v.boolean(),
    subscriptionId: v.optional(v.string()),
    nextAuditAt: v.number(),
    alertConfig: v.object({
      scoreDropThreshold: v.number(),
      criticalFindings: v.boolean(),
      crawlerBlocked: v.boolean(),
    }),
  })
    .index('by_user', ['userId'])
    .index('by_next_audit', ['monitoringEnabled', 'nextAuditAt']),

  shareable_reports: defineTable({
    auditId: v.string(),
    siteId: v.string(),
    token: v.string(),
  })
    .index('by_token', ['token'])
    .index('by_audit', ['auditId']),
```

In the `audits` table definition, add after `promptVersion`:

```typescript
    siteId: v.optional(v.string()),
```

- [ ] **Step 2: Push schema to Convex**

```bash
npx convex dev
```

Expected output includes: no TypeScript errors, schema deployed.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add sites, shareable_reports tables; siteId on audits"
```

---

## Task 3: Create `convex/sites.ts`

**Files:**
- Create: `convex/sites.ts`

- [ ] **Step 1: Create the file**

```typescript
import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

export const listByUser = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const userId = identity.subject.split('|')[0]
    return await anyDb(ctx)
      .query('sites')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect()
  },
})

export const getById = queryGeneric({
  args: { siteId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.siteId)
  },
})

export const getDueSites = queryGeneric({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('sites')
      .withIndex('by_next_audit', (q: any) =>
        q.eq('monitoringEnabled', true).lte('nextAuditAt', args.now)
      )
      .collect()
  },
})

export const getBySubscriptionId = queryGeneric({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('sites')
      .filter((q: any) => q.eq(q.field('subscriptionId'), args.subscriptionId))
      .first()
  },
})

export const create = mutationGeneric({
  args: {
    url: v.string(),
    name: v.string(),
    schedule: v.union(v.literal('weekly'), v.literal('monthly')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Não autorizado')
    const userId = identity.subject.split('|')[0]
    return await anyDb(ctx).insert('sites', {
      userId,
      url: args.url,
      name: args.name,
      schedule: args.schedule,
      monitoringEnabled: false,
      nextAuditAt: Date.now(),
      alertConfig: {
        scoreDropThreshold: 10,
        criticalFindings: true,
        crawlerBlocked: true,
      },
    })
  },
})

export const updateAlertConfig = mutationGeneric({
  args: {
    siteId: v.string(),
    alertConfig: v.object({
      scoreDropThreshold: v.number(),
      criticalFindings: v.boolean(),
      crawlerBlocked: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, { alertConfig: args.alertConfig })
  },
})

export const updateNextAudit = mutationGeneric({
  args: { siteId: v.string(), nextAuditAt: v.number() },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, { nextAuditAt: args.nextAuditAt })
  },
})

export const setMonitoringEnabled = mutationGeneric({
  args: {
    siteId: v.string(),
    enabled: v.boolean(),
    subscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, {
      monitoringEnabled: args.enabled,
      ...(args.subscriptionId !== undefined ? { subscriptionId: args.subscriptionId } : {}),
    })
  },
})
```

- [ ] **Step 2: Verify Convex picks it up**

```bash
npx convex dev
```

Expected: no errors; new `sites.*` functions visible in Convex dashboard.

- [ ] **Step 3: Commit**

```bash
git add convex/sites.ts
git commit -m "feat(sites): CRUD mutations and queries for sites table"
```

---

## Task 4: Add `getById` to `convex/users.ts`

**Files:**
- Modify: `convex/users.ts`

Needed by `checkAndSendAlerts` to look up the user's email.

- [ ] **Step 1: Add the query**

At the end of `convex/users.ts`, add:

```typescript
export const getById = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.userId)
  },
})
```

- [ ] **Step 2: Verify**

```bash
npx convex dev
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat(users): add getById query"
```

---

## Task 5: Extend `runAudit` to accept `siteId`

**Files:**
- Modify: `convex/audits.ts`
- Modify: `convex/actions/audit.ts`

- [ ] **Step 1: Update `createPending` in `convex/audits.ts`**

Replace the `createPending` export:

```typescript
export const createPending = mutationGeneric({
  args: {
    userId: v.string(),
    url: v.string(),
    billedAs: v.union(v.literal('credit'), v.literal('free')),
    siteId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await anyDb(ctx).insert('audits', {
      userId: args.userId,
      url: args.url,
      status: 'pending',
      billedAs: args.billedAs,
      createdAt: Date.now(),
      ...(args.siteId ? { siteId: args.siteId } : {}),
    })
  },
})
```

- [ ] **Step 2: Add `listBySite` query in `convex/audits.ts`**

Add after `getById`:

```typescript
export const listBySite = queryGeneric({
  args: { siteId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('audits')
      .filter((q: any) => q.eq(q.field('siteId'), args.siteId))
      .order('desc')
      .take(args.limit ?? 12)
  },
})
```

- [ ] **Step 3: Update `convex/actions/audit.ts`**

Replace the entire file content with the updated version that adds `siteId` arg and post-completion logic:

```typescript
'use node'

import dns from 'node:dns'
import { actionGeneric, anyApi } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { crawlSite } from '../lib/crawler.js'
import { runAeoAnalysis } from '../lib/aeoAnalyzer.js'

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fc00:/,
  /^fd[0-9a-f]{2}:/i,
  /^169\.254\./,
]

async function validateUrl(urlString: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    throw new ConvexError('URL inválida')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConvexError('URL não permitida')
  }
  const hostname = parsed.hostname
  if (PRIVATE_IP_RANGES.some((re) => re.test(hostname))) {
    throw new ConvexError('URL não permitida')
  }
  try {
    const { address } = await dns.promises.lookup(hostname)
    if (PRIVATE_IP_RANGES.some((re) => re.test(address))) {
      throw new ConvexError('URL não permitida')
    }
  } catch (err) {
    if (err instanceof ConvexError) throw err
    throw new ConvexError('URL não permitida')
  }
  return parsed
}

export const runAudit = actionGeneric({
  args: { url: v.string(), siteId: v.optional(v.string()) },
  handler: async (ctx, { url, siteId }) => {
    const identity = await ctx.auth.getUserIdentity()
    const isDev =
      process.env.AUTH_EMAIL_MOCK === '1' ||
      process.env.CONVEX_DEPLOYMENT?.startsWith('dev:') === true
    if (!identity && !isDev) throw new ConvexError('Não autorizado')

    const validUrl = await validateUrl(url)
    const userId = identity
      ? identity.subject.split('|')[0]
      : ((await ctx.runMutation(anyApi.users.getOrCreateUser, {
          email: 'dev@localhost',
        })) as string)

    const rateLimitAllowed = await ctx.runMutation(
      anyApi.lib.rateLimit.checkRateLimit,
      { key: userId, windowMs: 60_000, limit: 5 }
    )
    if (!rateLimitAllowed) throw new ConvexError('Limite de requisições atingido')

    let billedAs: 'credit' | 'free' = 'free'
    // Monitored site audits are free (subscription covers them)
    if (!siteId && (!isDev || identity)) {
      const gate = (await ctx.runMutation(anyApi.users.checkAndConsumeUsage, {
        userId,
      })) as { allowed: boolean; billedAs?: string; reason?: string }
      if (!gate.allowed) throw new ConvexError(gate.reason ?? 'Sem créditos')
      billedAs = (gate.billedAs ?? 'credit') as 'credit' | 'free'
    }

    const auditId = (await ctx.runMutation(anyApi.audits.createPending, {
      userId,
      url: validUrl.href,
      billedAs,
      siteId,
    })) as string

    const anthropicKey = process.env.OPENROUTER_API_KEY
    if (!anthropicKey) throw new ConvexError('OPENROUTER_API_KEY não configurada')

    try {
      const crawled = await crawlSite(validUrl.href)
      const findings = await runAeoAnalysis(
        { url: validUrl.href, ...crawled },
        anthropicKey,
        process.env.OPENROUTER_MODEL
      )

      await ctx.runMutation(anyApi.audits.markComplete, {
        auditId,
        score: findings.score,
        outputFiles: JSON.stringify(findings),
        promptVersion: findings.promptVersion,
      })
      await ctx.runMutation(anyApi.usageLogs.log, { userId, auditId })

      if (siteId) {
        const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any
        if (site) {
          const intervalMs =
            site.schedule === 'weekly'
              ? 7 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000
          await ctx.runMutation(anyApi.sites.updateNextAudit, {
            siteId,
            nextAuditAt: Date.now() + intervalMs,
          })
          await ctx.runAction(anyApi.actions.alerts.checkAndSendAlerts, {
            siteId,
            auditId,
          })
        }
      }

      return { auditId, score: findings.score }
    } catch (err) {
      await ctx.runMutation(anyApi.audits.markFailed, {
        auditId,
        errorMessage: err instanceof Error ? err.message : 'Falha na auditoria',
      })
      throw new ConvexError(
        err instanceof Error ? err.message : 'Falha na auditoria'
      )
    }
  },
})
```

- [ ] **Step 4: Verify**

```bash
npx convex dev
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add convex/audits.ts convex/actions/audit.ts
git commit -m "feat(audit): accept siteId, skip credit gate for monitored audits, trigger alerts"
```

---

## Task 6: Monitoring cron + action

**Files:**
- Create: `convex/crons.ts`
- Create: `convex/actions/monitoring.ts`

- [ ] **Step 1: Create `convex/actions/monitoring.ts`**

```typescript
'use node'

import { actionGeneric, anyApi } from 'convex/server'

export const runDueSiteAudits = actionGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const dueSites = (await ctx.runQuery(anyApi.sites.getDueSites, { now })) as Array<{
      _id: string
      url: string
    }>

    for (const site of dueSites) {
      try {
        await ctx.runAction(anyApi.actions.audit.runAudit, {
          url: site.url,
          siteId: site._id,
        })
      } catch (err) {
        // Log and continue — one failure must not block the rest
        console.error(`Monitoring audit failed for site ${site._id}:`, err)
      }
    }
  },
})
```

- [ ] **Step 2: Create `convex/crons.ts`**

```typescript
import { cronJobs } from 'convex/server'
import { anyApi } from 'convex/server'

const crons = cronJobs()

crons.interval(
  'run due site audits',
  { hours: 1 },
  anyApi.actions.monitoring.runDueSiteAudits,
  {}
)

export default crons
```

- [ ] **Step 3: Verify cron is registered**

```bash
npx convex dev
```

Expected: Convex dashboard → Scheduled Functions shows "run due site audits" with 1h interval.

- [ ] **Step 4: Commit**

```bash
git add convex/crons.ts convex/actions/monitoring.ts
git commit -m "feat(monitoring): hourly cron to auto-audit due sites"
```

---

## Task 7: Create `convex/actions/alerts.ts`

**Files:**
- Create: `convex/actions/alerts.ts`

- [ ] **Step 1: Create the file**

```typescript
'use node'

import { actionGeneric, anyApi } from 'convex/server'
import { v } from 'convex/values'

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'airio <alertas@ai.rio.br>',
      to,
      subject,
      html,
    }),
  })
  if (!res.ok) {
    console.error('Resend error:', await res.text())
  }
}

export const checkAndSendAlerts = actionGeneric({
  args: { siteId: v.string(), auditId: v.string() },
  handler: async (ctx, { siteId }) => {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return

    const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any
    if (!site) return

    // Get two most recent complete audits for this site
    const audits = (await ctx.runQuery(anyApi.audits.listBySite, {
      siteId,
      limit: 2,
    })) as any[]

    if (audits.length < 2) return

    const current = audits[0]
    const previous = audits[1]
    if (!current?.outputFiles || !previous?.outputFiles) return

    const curr = JSON.parse(current.outputFiles)
    const prev = JSON.parse(previous.outputFiles)

    const user = (await ctx.runQuery(anyApi.users.getById, {
      userId: site.userId,
    })) as any
    if (!user?.email) return

    const detailUrl = `https://app.ai.rio.br/sites/${siteId}`

    // 1. Score drop
    if (
      typeof current.score === 'number' &&
      typeof previous.score === 'number' &&
      previous.score - current.score >= site.alertConfig.scoreDropThreshold
    ) {
      await sendEmail(
        resendKey,
        user.email,
        `⚠ Score caiu de ${previous.score} para ${current.score} em ${site.name}`,
        `<p>O score AEO de <strong>${site.name}</strong> caiu de <strong>${previous.score}</strong> para <strong>${current.score}</strong>.</p>
         <p><a href="${detailUrl}">Ver detalhes →</a></p>`
      )
    }

    // 2. New CRITICAL findings
    if (site.alertConfig.criticalFindings) {
      const prevCriticalIds = new Set(
        ((prev.findings ?? []) as any[])
          .filter((f: any) => f.severity === 'critical')
          .map((f: any) => f.id ?? f.title)
      )
      const newCritical = ((curr.findings ?? []) as any[]).filter(
        (f: any) => f.severity === 'critical' && !prevCriticalIds.has(f.id ?? f.title)
      )
      if (newCritical.length > 0) {
        await sendEmail(
          resendKey,
          user.email,
          `🚨 Novo problema crítico detectado em ${site.name}`,
          `<p><strong>${newCritical.length} novo(s) problema(s) crítico(s)</strong> em <strong>${site.name}</strong>.</p>
           <ul>${newCritical.map((f: any) => `<li>${f.title ?? f.id}</li>`).join('')}</ul>
           <p><a href="${detailUrl}">Ver detalhes →</a></p>`
        )
      }
    }

    // 3. Newly blocked AI crawlers
    if (site.alertConfig.crawlerBlocked) {
      const prevBlocked = new Set(
        ((prev.robotsPatch ?? []) as any[])
          .filter((r: any) => r.blocked)
          .map((r: any) => r.bot)
      )
      const newlyBlocked = ((curr.robotsPatch ?? []) as any[]).filter(
        (r: any) => r.blocked && !prevBlocked.has(r.bot)
      )
      for (const r of newlyBlocked) {
        await sendEmail(
          resendKey,
          user.email,
          `🤖 ${r.bot} bloqueado em ${site.name} — ação necessária`,
          `<p><strong>${r.bot}</strong> foi bloqueado em <strong>${site.name}</strong>.</p>
           <p><a href="${detailUrl}">Ver instruções de correção →</a></p>`
        )
      }
    }
  },
})
```

- [ ] **Step 2: Verify**

```bash
npx convex dev
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/actions/alerts.ts
git commit -m "feat(alerts): checkAndSendAlerts — score drop, new critical, newly blocked crawler"
```

---

## Task 8: Create `convex/shareableReports.ts`

**Files:**
- Create: `convex/shareableReports.ts`

- [ ] **Step 1: Create the file**

```typescript
import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export const create = mutationGeneric({
  args: { auditId: v.string(), siteId: v.string() },
  handler: async (ctx, args) => {
    // Idempotent — return existing token if this audit is already shared
    const existing = await anyDb(ctx)
      .query('shareable_reports')
      .withIndex('by_audit', (q: any) => q.eq('auditId', args.auditId))
      .first()
    if (existing) return existing.token

    const token = generateToken()
    await anyDb(ctx).insert('shareable_reports', {
      auditId: args.auditId,
      siteId: args.siteId,
      token,
    })
    return token
  },
})

export const getByToken = queryGeneric({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const report = await anyDb(ctx)
      .query('shareable_reports')
      .withIndex('by_token', (q: any) => q.eq('token', args.token))
      .first()
    if (!report) return null

    const audit = await anyDb(ctx).get(report.auditId)
    const site = await anyDb(ctx).get(report.siteId)
    return { report, audit, site }
  },
})
```

- [ ] **Step 2: Verify**

```bash
npx convex dev
```

Expected: no errors; `shareableReports.create` and `shareableReports.getByToken` visible in Convex dashboard.

- [ ] **Step 3: Commit**

```bash
git add convex/shareableReports.ts
git commit -m "feat(reports): shareableReports — create (idempotent) and getByToken"
```

---

## Task 9: Dashboard — `/sites/[siteId]` detail page

**Files:**
- Create: `dashboard/app/sites/[siteId]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { api } from 'airio-convex/_generated/api'
import { useMutation, useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'

function scoreColor(score: number) {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

export default function SiteDetailPage() {
  const params = useParams<{ siteId: string }>()
  const router = useRouter()
  const site = useQuery(api.sites.getById, { siteId: params.siteId })
  const audits = useQuery(api.audits.listBySite, { siteId: params.siteId, limit: 12 })
  const createReport = useMutation(api.shareableReports.create)

  if (site === undefined || audits === undefined) {
    return <div className="p-8 text-center text-sm text-gray-500">Carregando…</div>
  }
  if (site === null) {
    return <div className="p-8 text-center text-sm text-red-500">Site não encontrado.</div>
  }

  const latestAudit = audits[0]
  const latestFindings = latestAudit?.outputFiles
    ? JSON.parse(latestAudit.outputFiles)
    : null

  async function handleShare() {
    if (!latestAudit) return
    const token = await createReport({ auditId: latestAudit._id, siteId: params.siteId })
    const url = `${window.location.origin}/report/${token}`
    await navigator.clipboard.writeText(url).catch(() => {})
    alert(`Link copiado: ${url}`)
  }

  // Build sparkline points from oldest→newest, filter out null scores
  const scoreHistory = [...audits]
    .reverse()
    .filter((a) => a.score !== null) as Array<{ _id: string; score: number; _creationTime: number }>

  const svgW = Math.max((scoreHistory.length - 1) * 60, 60)

  return (
    <main className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <button
        onClick={() => router.push('/')}
        className="text-xs text-gray-500 hover:text-gray-800 uppercase tracking-wide"
      >
        ← Dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{site.name}</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">{site.url}</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
            {site.schedule === 'weekly' ? 'Semanal' : 'Mensal'}
            {' · '}
            {site.monitoringEnabled ? '● Ativo' : '○ Inativo'}
          </p>
        </div>
        {latestAudit?.score !== null && latestAudit?.score !== undefined && (
          <div className="text-right shrink-0">
            <div className={`text-6xl font-bold ${scoreColor(latestAudit.score)}`}>
              {latestAudit.score}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Score AEO</div>
          </div>
        )}
      </div>

      {/* Score history chart */}
      {scoreHistory.length > 1 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-500">
            Histórico ({scoreHistory.length} auditorias)
          </h2>
          <div className="border rounded-lg p-4 bg-gray-50 overflow-x-auto">
            <svg viewBox={`0 0 ${svgW} 80`} className="w-full h-24 min-w-[200px]">
              {scoreHistory.map((a, i) => {
                if (i === 0) return null
                const prev = scoreHistory[i - 1]
                const x1 = (i - 1) * 60
                const y1 = 75 - (prev.score / 100) * 65
                const x2 = i * 60
                const y2 = 75 - (a.score / 100) * 65
                return (
                  <line key={a._id} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#2563eb" strokeWidth="2" />
                )
              })}
              {scoreHistory.map((a, i) => (
                <circle key={`dot-${a._id}`}
                  cx={i * 60} cy={75 - (a.score / 100) * 65}
                  r="4" fill="#2563eb" />
              ))}
            </svg>
          </div>
        </section>
      )}

      {/* Findings */}
      {latestFindings?.findings && latestFindings.findings.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-500">
            Problemas ({latestFindings.findings.length})
          </h2>
          <div className="space-y-2">
            {latestFindings.findings.map((f: any, i: number) => (
              <div key={i} className="border rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    f.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    f.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                    f.severity === 'medium'   ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                  }`}>{f.severity}</span>
                  <span className="font-medium">{f.title}</span>
                </div>
                {f.description && (
                  <p className="text-gray-500 text-xs">{f.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Alert config */}
      <AlertConfig site={site} siteId={params.siteId} />

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {latestAudit && (
          <button
            onClick={() => router.push(`/audit/${latestAudit._id}`)}
            className="text-sm border rounded-lg px-4 py-2 hover:bg-gray-50"
          >
            Ver auditoria completa →
          </button>
        )}
        <button
          onClick={handleShare}
          className="text-sm border rounded-lg px-4 py-2 hover:bg-gray-50"
        >
          Compartilhar relatório
        </button>
      </div>
    </main>
  )
}

function AlertConfig({ site, siteId }: { site: any; siteId: string }) {
  const updateAlerts = useMutation(api.sites.updateAlertConfig)

  async function toggle(field: 'criticalFindings' | 'crawlerBlocked') {
    await updateAlerts({
      siteId,
      alertConfig: {
        ...site.alertConfig,
        [field]: !site.alertConfig[field],
      },
    })
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-500">
        Alertas por email
      </h2>
      <div className="border rounded-lg divide-y text-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-medium">Queda de score</div>
            <div className="text-xs text-gray-400">
              Alertar se cair ≥ {site.alertConfig.scoreDropThreshold} pontos
            </div>
          </div>
          <span className="text-xs text-gray-400">Sempre ativo</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-medium">Novos problemas críticos</div>
            <div className="text-xs text-gray-400">Alertar ao detectar novo problema crítico</div>
          </div>
          <button
            onClick={() => toggle('criticalFindings')}
            className={`w-10 h-6 rounded-full transition-colors ${
              site.alertConfig.criticalFindings ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${
              site.alertConfig.criticalFindings ? 'translate-x-2' : '-translate-x-2'
            }`} />
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-medium">Crawler de IA bloqueado</div>
            <div className="text-xs text-gray-400">Alertar se GPTBot, ClaudeBot etc. forem bloqueados</div>
          </div>
          <button
            onClick={() => toggle('crawlerBlocked')}
            className={`w-10 h-6 rounded-full transition-colors ${
              site.alertConfig.crawlerBlocked ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${
              site.alertConfig.crawlerBlocked ? 'translate-x-2' : '-translate-x-2'
            }`} />
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify dev server**

```bash
cd dashboard && bun run dev
```

Navigate to `http://localhost:3002/sites/INVALID` — should show "Site não encontrado." No console errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/sites/
git commit -m "feat(dashboard): /sites/[siteId] — score history, findings, alert config, share"
```

---

## Task 10: Dashboard — `/report/[token]` public route

**Files:**
- Create: `dashboard/app/report/[token]/page.tsx`

No auth required — accessible without being signed in.

- [ ] **Step 1: Create the page**

```tsx
'use client'

import { api } from 'airio-convex/_generated/api'
import { useQuery } from 'convex/react'
import { useParams } from 'next/navigation'

export default function PublicReportPage() {
  const params = useParams<{ token: string }>()
  const data = useQuery(api.shareableReports.getByToken, { token: params.token })

  if (data === undefined) {
    return <div className="p-8 text-center text-sm text-gray-500">Carregando…</div>
  }
  if (data === null) {
    return <div className="p-8 text-center text-sm text-red-500">Relatório não encontrado.</div>
  }

  const { audit, site } = data
  const findings = audit?.outputFiles ? JSON.parse(audit.outputFiles) : null
  const score = audit?.score ?? null

  function scoreColor(s: number) {
    if (s >= 70) return 'text-green-600'
    if (s >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Relatório AEO</div>
          <h1 className="text-2xl font-bold">{site?.name ?? site?.url}</h1>
          <p className="text-sm text-gray-500 font-mono">{site?.url}</p>
        </div>
        {score !== null && (
          <div className="text-right shrink-0">
            <div className={`text-6xl font-bold ${scoreColor(score)}`}>{score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Score AEO</div>
          </div>
        )}
      </div>

      {/* Findings */}
      {findings?.findings && findings.findings.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 text-gray-500">
            Problemas encontrados
          </h2>
          <div className="space-y-2">
            {findings.findings.map((f: any, i: number) => (
              <div key={i} className="border rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                    f.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    f.severity === 'high'     ? 'bg-orange-100 text-orange-700' :
                    f.severity === 'medium'   ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-600'
                  }`}>{f.severity}</span>
                  <span className="font-medium">{f.title}</span>
                </div>
                {f.description && (
                  <p className="text-gray-500 text-xs">{f.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t pt-8 text-center text-xs text-gray-400">
        Gerado por <strong>airio</strong> — Plataforma de Monitoramento AEO para o Mercado Brasileiro
        <br />
        <a href="https://ai.rio.br" className="underline mt-1 inline-block">ai.rio.br</a>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify**

```bash
cd dashboard && bun run dev
```

Navigate to `http://localhost:3002/report/invalid` without being signed in — should show "Relatório não encontrado." without redirecting to sign-in.

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/report/
git commit -m "feat(dashboard): /report/[token] public shareable report page"
```

---

## Task 11: Home page — sites list

**Files:**
- Modify: `dashboard/app/_page-client.tsx`

- [ ] **Step 1: Add sites query**

In `dashboard/app/_page-client.tsx`, after line 95 (the `balance` query), add:

```typescript
const sites = useQuery(api.sites.listByUser, convexAuth ? {} : 'skip')
```

- [ ] **Step 2: Add sites list section**

In the JSX return, after the `zeroCreditsBanner` block and before the "Auditorias recentes" section, insert:

```tsx
{convexAuth && sites && sites.length > 0 && (
  <section>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold">Sites monitorados</h2>
      <span className="text-xs text-gray-400">{sites.length} site(s)</span>
    </div>
    <Card>
      <CardContent className="p-0">
        {(sites as any[]).map((site: any, idx: number) => (
          <div key={site._id}>
            {idx > 0 && <Separator />}
            <button
              type="button"
              onClick={() => router.push(`/sites/${site._id}`)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <div>
                <div className="font-medium">{site.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{site.url}</div>
              </div>
              <span className="text-muted-foreground shrink-0">›</span>
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  </section>
)}
```

- [ ] **Step 3: Verify**

Insert a test site via Convex dashboard with your userId, then check home page shows the sites list.

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/_page-client.tsx
git commit -m "feat(dashboard): show monitored sites list on home page"
```

---

## Task 12: Subscription webhook handlers

**Files:**
- Modify: `convex/actions/webhook.ts`

- [ ] **Step 1: Add subscription event handlers**

Replace the full content of `convex/actions/webhook.ts`:

```typescript
'use node'

import { actionGeneric, anyApi } from 'convex/server'
import { v } from 'convex/values'

export const handleDodoWebhook = actionGeneric({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, { payload }) => {
    // TODO: verify HMAC signature with DODO_WEBHOOK_SECRET before prod launch
    const event = JSON.parse(payload)

    // One-off credit purchase
    if (event.type === 'payment.succeeded') {
      const { userId, amount } = event.data.metadata ?? {}
      const paymentId = event.data.payment_id ?? event.data.id
      if (userId && amount && paymentId) {
        await ctx.runMutation(anyApi.billing.addCredits, {
          userId,
          amount: Number(amount),
          dodoPaymentId: paymentId,
        })
      }
    }

    // Subscription activated → enable monitoring for the site
    if (event.type === 'subscription.activated') {
      const subscriptionId: string = event.data.id
      const siteId: string | undefined = event.data.metadata?.siteId
      if (siteId) {
        await ctx.runMutation(anyApi.sites.setMonitoringEnabled, {
          siteId,
          enabled: true,
          subscriptionId,
        })
      }
    }

    // Subscription cancelled or past due → disable monitoring (history retained)
    if (
      event.type === 'subscription.cancelled' ||
      event.type === 'subscription.past_due'
    ) {
      const subscriptionId: string = event.data.id
      const site = (await ctx.runQuery(anyApi.sites.getBySubscriptionId, {
        subscriptionId,
      })) as any
      if (site) {
        await ctx.runMutation(anyApi.sites.setMonitoringEnabled, {
          siteId: site._id,
          enabled: false,
        })
      }
    }

    return { ok: true }
  },
})
```

- [ ] **Step 2: Verify**

```bash
npx convex dev
```

Expected: no errors.

- [ ] **Step 3: Manual prerequisite note**

Before subscriptions work end-to-end, create DodoPayments subscription products in the DodoPayments dashboard and note the product IDs. The checkout flow (in `convex/actions/checkout.ts`) will need updating with the product IDs — that's a separate billing-setup task outside this plan.

- [ ] **Step 4: Commit**

```bash
git add convex/actions/webhook.ts
git commit -m "feat(billing): subscription webhook handlers — activated/cancelled/past_due"
```

---

## Task 13: Set production LLM model

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Set OPENROUTER_MODEL in Convex deployment**

```bash
npx convex env set OPENROUTER_MODEL "anthropic/claude-3-5-haiku"
```

Recommended options:
- `anthropic/claude-3-5-haiku` — fast, cheap, good quality (recommended)
- `anthropic/claude-3-5-sonnet` — best quality, higher cost
- Keep `inclusionai/ling-2.6-1t:free` only for local dev if needed

- [ ] **Step 2: Run a test audit and verify CMS output is populated**

1. `cd dashboard && bun run dev`
2. Submit a URL (e.g. `https://meusite.com.br`)
3. On `/audit/[id]` page: **CMS instructions** and **schema blocks** sections must contain content (not empty/blank)

- [ ] **Step 3: Document in `.env.local.example`**

Add the line:
```
OPENROUTER_MODEL=anthropic/claude-3-5-haiku
```

- [ ] **Step 4: Commit**

```bash
git add .env.local.example
git commit -m "docs: add OPENROUTER_MODEL to .env.local.example"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| Fix `userId: ''` dev bypass bug | Task 1 |
| `sites` table with full schema | Task 2 |
| `shareable_reports` table | Task 2 |
| `siteId` on `audits` | Task 2 |
| Sites CRUD (create, list, get, updateAlertConfig, updateNextAudit, setMonitoringEnabled) | Task 3 |
| `users.getById` for alerts | Task 4 |
| `runAudit` accepts `siteId` | Task 5 |
| Monitored audits don't consume credits | Task 5 |
| `nextAuditAt` updated post-audit | Task 5 |
| Hourly cron for due sites | Task 6 |
| `checkAndSendAlerts` — score drop alert | Task 7 |
| `checkAndSendAlerts` — new CRITICAL finding alert | Task 7 |
| `checkAndSendAlerts` — AI crawler newly blocked alert | Task 7 |
| `createShareableReport` mutation (idempotent) | Task 8 |
| `/sites/[siteId]` — score history chart | Task 9 |
| `/sites/[siteId]` — findings list | Task 9 |
| `/sites/[siteId]` — alert config toggles | Task 9 |
| `/sites/[siteId]` — share button | Task 9 |
| `/report/[token]` — public, no auth | Task 10 |
| Home page sites list | Task 11 |
| `subscription.activated` webhook | Task 12 |
| `subscription.cancelled / past_due` webhook | Task 12 |
| Production model upgrade | Task 13 |

### Gaps / manual prerequisites
- **DodoPayments product IDs:** Subscription checkout flow (`checkout.ts`) needs product IDs from the DodoPayments dashboard. Not automated — must be done manually before billing works end-to-end.
- **HMAC signature verification** in `webhook.ts` is marked TODO — must be implemented before production launch to prevent forged webhook events.
- **"Add Site" UI flow** (button → create site → redirect to checkout): not in this plan. The `sites.create` mutation and checkout integration need a small UI form — add as a follow-up task.

### Type consistency
- `siteId` is `v.string()` throughout — matches the `anyDb` pattern used everywhere.
- `userId` is stored as `identity.subject.split('|')[0]` — consistent with all existing code.
- `api.sites.*`, `api.audits.listBySite`, `api.shareableReports.*` — all defined in earlier tasks before being referenced in later ones.
