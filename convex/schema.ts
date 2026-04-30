import { authTables } from '@convex-dev/auth/server';
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    plan: v.optional(v.string()),
    dodoCustomerId: v.optional(v.string()),
    planRenewsAt: v.optional(v.number()),
    freeUsedThisMonth: v.optional(v.number()),
    lastFreeReset: v.optional(v.number()),
  })
    .index('email', ['email'])
    .index('phone', ['phone']),

  credits: defineTable({
    userId: v.id('users'),
    amount: v.number(),
    dodoPaymentId: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_dodo_payment', ['dodoPaymentId']),

  audits: defineTable({
    userId: v.id('users'),
    url: v.string(),
    status: v.union(v.literal('pending'), v.literal('complete'), v.literal('failed')),
    // AEO score 0-100
    score: v.optional(v.number()),
    // JSON: { llmsTxt, robotsPatch, schemaBlocks, rewrittenPassages, findings }
    outputFiles: v.optional(v.string()),
    billedAs: v.union(v.literal('credit'), v.literal('free')),
    errorMessage: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    siteId: v.optional(v.id('sites')),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_user_and_created', ['userId', 'createdAt'])
    .index('by_site', ['siteId']),

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
    competitors: v.optional(v.array(v.string())), // competitor brand names to track
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
    citationPosition: v.optional(v.number()), // 0 = not cited, 1+ = sentence rank of first brand mention
    brandName: v.optional(v.string()), // undefined = own brand, set = competitor brand name
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
    avgPosition: v.optional(v.number()), // average citation position across cited samples only
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

  shareable_reports: defineTable({
    auditId: v.id('audits'),
    siteId: v.id('sites'),
    token: v.string(),
  })
    .index('by_token', ['token'])
    .index('by_audit', ['auditId']),

  usageLogs: defineTable({
    userId: v.id('users'),
    auditId: v.id('audits'),
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_timestamp', ['userId', 'timestamp']),

  rateLimitEvents: defineTable({
    key: v.string(),
    ts: v.number(),
  }).index('by_key_and_ts', ['key', 'ts']),
});
