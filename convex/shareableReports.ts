import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

export const create = mutationGeneric({
  args: { auditId: v.string(), siteId: v.string() },
  handler: async (ctx, args) => {
    const existing = await anyDb(ctx)
      .query('shareable_reports')
      .withIndex('by_audit', (q: any) => q.eq('auditId', args.auditId))
      .first()
    if (existing) return existing.token

    const token = generateToken()
    await anyDb(ctx).insert('shareable_reports', {
      auditId: args.auditId,
      siteId: args.siteId,
      token,
    })
    return token
  },
})

export const getByToken = queryGeneric({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const report = await anyDb(ctx)
      .query('shareable_reports')
      .withIndex('by_token', (q: any) => q.eq('token', args.token))
      .first()
    if (!report) return null

    const audit = await anyDb(ctx).get(report.auditId)
    const site = await anyDb(ctx).get(report.siteId)
    return { report, audit, site }
  },
})
