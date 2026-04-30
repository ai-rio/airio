import { mutationGeneric, queryGeneric } from 'convex/server';
import { ConvexError, v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

const FREE_AUDITS_PER_MONTH = 1;

export const getOrCreateUser = mutationGeneric({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await anyDb(ctx)
      .query('users')
      .withIndex('email', (q: any) => q.eq('email', email))
      .unique();
    if (existing) return existing._id;

    return await anyDb(ctx).insert('users', {
      email,
      freeUsedThisMonth: 0,
      lastFreeReset: Date.now(),
    });
  },
});

export const checkAndConsumeUsage = mutationGeneric({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await anyDb(ctx).get(userId);
    if (!user) throw new ConvexError('User not found');

    // Reset monthly free counter
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const lastReset = user.lastFreeReset ?? 0;
    if (now - lastReset > oneMonth) {
      await anyDb(ctx).patch(userId, { freeUsedThisMonth: 0, lastFreeReset: now });
      user.freeUsedThisMonth = 0;
    }

    // Check paid credits first
    const credits = await anyDb(ctx)
      .query('credits')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
    const totalCredits = credits.reduce((sum: number, c: any) => sum + c.amount, 0);

    const usageLogs = await anyDb(ctx)
      .query('usageLogs')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
    const usedCredits = usageLogs.length;

    if (totalCredits > usedCredits) {
      return { allowed: true, billedAs: 'credit' };
    }

    // Fall back to free tier
    const freeUsed = user.freeUsedThisMonth ?? 0;
    if (freeUsed < FREE_AUDITS_PER_MONTH) {
      await anyDb(ctx).patch(userId, { freeUsedThisMonth: freeUsed + 1 });
      return { allowed: true, billedAs: 'free' };
    }

    return { allowed: false, reason: 'Sem créditos. Adquira mais para continuar.' };
  },
});

export const getCreditsBalance = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const credits = await anyDb(ctx)
      .query('credits')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
    const total = credits.reduce((sum: number, c: any) => sum + c.amount, 0);

    const usageLogs = await anyDb(ctx)
      .query('usageLogs')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();

    return { total, used: usageLogs.length, remaining: total - usageLogs.length };
  },
});

export const getMyCreditsBalance = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { total: 0, used: 0, remaining: 0, freeRemaining: 0 };
    const userId = identity.subject.split('|')[0];

    const credits = await anyDb(ctx)
      .query('credits')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
    const total = credits.reduce((sum: number, c: any) => sum + c.amount, 0);

    const usageLogs = await anyDb(ctx)
      .query('usageLogs')
      .withIndex('by_user', (q: any) => q.eq('userId', userId))
      .collect();
    const used = usageLogs.length;

    const user = await anyDb(ctx).get(userId);
    const freeUsed = user?.freeUsedThisMonth ?? 0;
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const lastReset = user?.lastFreeReset ?? 0;
    const freeResetDue = now - lastReset > oneMonth;
    const freeRemaining = freeResetDue
      ? FREE_AUDITS_PER_MONTH
      : Math.max(0, FREE_AUDITS_PER_MONTH - freeUsed);

    return { total, used, remaining: total - used, freeRemaining };
  },
});

export const getMe = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { email: identity.email ?? null };
  },
});

export const getById = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await anyDb(ctx).get(args.userId);
  },
});
