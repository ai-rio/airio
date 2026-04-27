import { mutationGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

export const checkRateLimit = mutationGeneric({
  args: {
    key: v.string(),
    windowMs: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, { key, windowMs, limit }) => {
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old events
    const old = await anyDb(ctx)
      .query('rateLimitEvents')
      .withIndex('by_key_and_ts', (q: any) =>
        q.eq('key', key).lt('ts', windowStart)
      )
      .collect()
    for (const e of old) await anyDb(ctx).delete(e._id)

    // Count recent events
    const recent = await anyDb(ctx)
      .query('rateLimitEvents')
      .withIndex('by_key_and_ts', (q: any) =>
        q.eq('key', key).gte('ts', windowStart)
      )
      .collect()

    if (recent.length >= limit) return false

    await anyDb(ctx).insert('rateLimitEvents', { key, ts: now })
    return true
  },
})
