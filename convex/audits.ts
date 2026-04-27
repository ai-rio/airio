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
  },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.auditId, {
      status: 'complete',
      score: args.score,
      outputFiles: args.outputFiles,
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
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('audits')
      .withIndex('by_user_and_created', (q: any) => q.eq('userId', args.userId))
      .order('desc')
      .take(50)
  },
})

export const getById = queryGeneric({
  args: { auditId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.auditId)
  },
})
