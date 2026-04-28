import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

export const createPending = mutationGeneric({
  args: {
    userId: v.string(),
    url: v.string(),
    billedAs: v.union(v.literal('credit'), v.literal('free')),
  },
  handler: async (ctx, args) => {
    return await anyDb(ctx).insert('audits', {
      userId: args.userId,
      url: args.url,
      status: 'pending',
      billedAs: args.billedAs,
      createdAt: Date.now(),
    })
  },
})

export const markComplete = mutationGeneric({
  args: {
    auditId: v.string(),
    score: v.number(),
    outputFiles: v.string(),
    promptVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.auditId, {
      status: 'complete',
      score: args.score,
      outputFiles: args.outputFiles,
      promptVersion: args.promptVersion,
    })
  },
})

export const markFailed = mutationGeneric({
  args: { auditId: v.string(), errorMessage: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.auditId, {
      status: 'failed',
      errorMessage: args.errorMessage,
    })
  },
})

export const listByUser = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []
    const userId = identity.subject.split('|')[0]
    return await anyDb(ctx)
      .query('audits')
      .withIndex('by_user_and_created', (q: any) => q.eq('userId', userId))
      .order('desc')
      .take(50)
  },
})

export const listRecent = queryGeneric({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('audits')
      .order('desc')
      .take(args.limit ?? 20)
  },
})

export const getById = queryGeneric({
  args: { auditId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.auditId)
  },
})
