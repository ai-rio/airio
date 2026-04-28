import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { anyApi } from 'convex/server'
import { auth } from './auth'

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: '/webhooks/dodo',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text()
    const signature = request.headers.get('webhook-signature') ?? ''

    await ctx.runAction(anyApi.actions.webhook.handleDodoWebhook, {
      payload,
      signature,
    })

    return new Response('ok', { status: 200 })
  }),
})

export default http
