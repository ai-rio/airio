import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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
    status: v.union(
      v.literal('pending'),
      v.literal('complete'),
      v.literal('failed')
    ),
    // AEO score 0-100
    score: v.optional(v.number()),
    // JSON: { llmsTxt, robotsPatch, schemaBlocks, rewrittenPassages, findings }
    outputFiles: v.optional(v.string()),
    billedAs: v.union(
      v.literal('credit'),
      v.literal('free')
    ),
    errorMessage: v.optional(v.string()),
    promptVersion: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_user_and_created', ['userId', 'createdAt']),

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
})
