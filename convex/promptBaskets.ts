import { mutationGeneric, queryGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export const create = mutationGeneric({
  args: {
    siteId: v.id('sites'),
    brandName: v.string(),
    prompts: v.array(v.string()),
    engine: v.literal('perplexity'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    return await anyDb(ctx).insert('promptBaskets', {
      siteId: args.siteId,
      brandName: args.brandName,
      prompts: args.prompts,
      engine: args.engine,
      runsPerPrompt: 7,
      enabled: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutationGeneric({
  args: {
    basketId: v.id('promptBaskets'),
    brandName: v.optional(v.string()),
    prompts: v.optional(v.array(v.string())),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    const { basketId, ...rest } = args;
    const patch = Object.fromEntries(
      Object.entries(rest).filter(([, val]) => val !== undefined)
    );
    await anyDb(ctx).patch(basketId, patch);
  },
});

export const listBySite = queryGeneric({
  args: { siteId: v.id('sites') },
  handler: async (ctx, args) => {
    return await anyDb(ctx)
      .query('promptBaskets')
      .withIndex('by_site', (q: any) => q.eq('siteId', args.siteId))
      .collect();
  },
});

export const getById = queryGeneric({
  args: { basketId: v.id('promptBaskets') },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.basketId);
  },
});

export const remove = mutationGeneric({
  args: { basketId: v.id('promptBaskets') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Não autorizado');
    await anyDb(ctx).delete(args.basketId);
  },
});
