import { internalMutationGeneric, internalQueryGeneric, mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const listByUser = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject.split('|')[0];
    return await anyDb(ctx)
      .query('sites')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
  },
});

export const getById = queryGeneric({
  args: { siteId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.siteId);
  },
});

export const getDueSites = queryGeneric({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('sites')
      .withIndex('by_monitoring_enabled_and_next_audit_at', (q: any) =>
        q.eq('monitoringEnabled', true).lte('nextAuditAt', args.now)
      )
      .collect();
  },
});

export const getBySubscriptionId = queryGeneric({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('sites')
      .withIndex('by_subscription_id', (q: any) => q.eq('subscriptionId', args.subscriptionId))
      .first();
  },
});

export const create = mutationGeneric({
  args: {
    url: v.string(),
    name: v.string(),
    schedule: v.union(v.literal('weekly'), v.literal('monthly')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    const userId = identity.subject.split('|')[0];
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
    });
  },
});

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
    await anyDb(ctx).patch(args.siteId, { alertConfig: args.alertConfig });
  },
});

export const updateNextAudit = mutationGeneric({
  args: { siteId: v.string(), nextAuditAt: v.number() },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, { nextAuditAt: args.nextAuditAt });
  },
});

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
    });
  },
});

export const getDueSitesForGeo = internalQueryGeneric({
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

export const updateNextGeoCheck = internalMutationGeneric({
  args: { siteId: v.string(), nextGeoCheckAt: v.number() },
  handler: async (ctx, args) => {
    await anyDb(ctx).patch(args.siteId, { nextGeoCheckAt: args.nextGeoCheckAt });
  },
});
