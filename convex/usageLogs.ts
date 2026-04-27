import { mutationGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

export const log = mutationGeneric({
  args: { userId: v.string(), auditId: v.string() },
  handler: async (ctx, args) => {
    await anyDb(ctx).insert('usageLogs', {
      userId: args.userId,
      auditId: args.auditId,
      timestamp: Date.now(),
    })
  },
})
