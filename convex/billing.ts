import { internalMutationGeneric } from 'convex/server';
import { v } from 'convex/values';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any {
  return ctx.db;
}

export interface AddCreditsArgs {
  userId: string;
  amount: number;
  dodoPaymentId: string;
}

export async function handleAddCredits(ctx: { db: any }, args: AddCreditsArgs): Promise<void> {
  const existing = await ctx.db
    .query('credits')
    .withIndex('by_dodo_payment', (q: any) => q.eq('dodoPaymentId', args.dodoPaymentId))
    .unique();
  if (existing) return;

  await ctx.db.insert('credits', {
    userId: args.userId,
    amount: args.amount,
    dodoPaymentId: args.dodoPaymentId,
    createdAt: Date.now(),
  });
}

export const addCredits = internalMutationGeneric({
  args: { userId: v.string(), amount: v.number(), dodoPaymentId: v.string() },
  handler: (ctx, args) => handleAddCredits({ db: anyDb(ctx) }, args),
});
