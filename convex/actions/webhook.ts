'use node'

import { actionGeneric, anyApi } from 'convex/server'
import { v } from 'convex/values'

export const handleDodoWebhook = actionGeneric({
  args: { payload: v.string(), signature: v.string() },
  handler: async (ctx, { payload, signature }) => {
    // TODO: verify signature with DODO_WEBHOOK_SECRET
    const event = JSON.parse(payload)

    if (event.type === 'payment.succeeded') {
      const { userId, amount } = event.data.metadata ?? {}
      const paymentId = event.data.payment_id ?? event.data.id

      if (userId && amount && paymentId) {
        await ctx.runMutation(anyApi.billing.addCredits, {
          userId,
          amount: Number(amount),
          dodoPaymentId: paymentId,
        })
      }
    }

    if (event.type === 'subscription.activated') {
      const subscriptionId: string = event.data.id
      const siteId: string | undefined = event.data.metadata?.siteId
      if (siteId) {
        await ctx.runMutation(anyApi.sites.setMonitoringEnabled, {
          siteId,
          enabled: true,
          subscriptionId,
        })
      }
    }

    if (
      event.type === 'subscription.cancelled' ||
      event.type === 'subscription.past_due'
    ) {
      const subscriptionId: string = event.data.id
      const site = (await ctx.runQuery(anyApi.sites.getBySubscriptionId, {
        subscriptionId,
      })) as any
      if (site) {
        await ctx.runMutation(anyApi.sites.setMonitoringEnabled, {
          siteId: site._id,
          enabled: false,
        })
      }
    }

    return { ok: true }
  },
})
