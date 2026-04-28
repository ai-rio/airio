'use node'

import { actionGeneric, anyApi } from 'convex/server'

export const runDueSiteAudits = actionGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const dueSites = (await ctx.runQuery(anyApi.sites.getDueSites, { now })) as Array<{
      _id: string
      url: string
    }>

    for (const site of dueSites) {
      try {
        await ctx.runAction(anyApi.actions.audit.runAudit, {
          url: site.url,
          siteId: site._id,
        })
      } catch (err) {
        console.error(`Monitoring audit failed for site ${site._id}:`, err)
      }
    }
  },
})
