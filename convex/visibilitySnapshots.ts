import { internalMutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const insert = internalMutationGeneric({
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
