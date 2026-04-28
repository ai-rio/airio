'use node';

import { actionGeneric, anyApi } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import DodoPayments from 'dodopayments';

// Credit pack definitions — adjust product IDs in env
const PRODUCTS = {
  credits_10: { env: 'DODO_CREDITS_10_PRODUCT_ID', amount: 10 },
  credits_30: { env: 'DODO_CREDITS_30_PRODUCT_ID', amount: 30 },
  credits_100: { env: 'DODO_CREDITS_100_PRODUCT_ID', amount: 100 },
} as const;

export const createCheckoutSession = actionGeneric({
  args: {
    product: v.union(v.literal('credits_10'), v.literal('credits_30'), v.literal('credits_100')),
  },
  handler: async (ctx, { product }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Não autorizado');

    const email = identity.email;
    if (!email) throw new ConvexError('Email não encontrado');

    const apiKey = process.env.DODO_API_KEY;
    if (!apiKey) throw new ConvexError('Pagamento não configurado');

    const productDef = PRODUCTS[product];
    const productId = process.env[productDef.env];
    if (!productId) throw new ConvexError(`Produto ${product} não configurado`);

    const userId = identity.subject.split('|')[0];
    await ctx.runMutation(anyApi.users.getOrCreateUser, { email });

    const dodo = new DodoPayments({
      bearerToken: apiKey,
      environment: (process.env.DODO_ENV ?? 'live_mode') as 'live_mode' | 'test_mode',
    });

    const siteUrl = process.env.SITE_URL ?? '';
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email, name: email.split('@')[0] },
      metadata: { userId, amount: String(productDef.amount) },
      return_url: `${siteUrl}/dashboard/billing?success=1`,
    });

    return { checkoutUrl: session.checkout_url };
  },
});
