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
