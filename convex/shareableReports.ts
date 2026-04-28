import { mutationGeneric, queryGeneric } from 'convex/server'
import { v } from 'convex/values'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function anyDb(ctx: { db: unknown }): any { return ctx.db }

function generateToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export const create = mutationGeneric({
  args: { auditId: v.id('audits'), siteId: v.id('sites') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Não autorizado')
    const userId = identity.subject.split('|')[0]

    const audit = await anyDb(ctx).get(args.auditId)
    if (!audit || audit.userId !== userId) throw new Error('Não autorizado')

    const site = await anyDb(ctx).get(args.siteId)
    if (!site || site.userId !== userId) throw new Error('Não autorizado')

    if (audit.siteId?.toString() !== args.siteId.toString()) throw new Error('Audit não pertence a este site')

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
    if (!audit || !site) return null

    const findings = audit.outputFiles ? (() => {
      try { return JSON.parse(audit.outputFiles) } catch { return null }
    })() : null

    return {
      siteName: site.name as string,
      siteUrl: site.url as string,
      score: audit.score as number | null,
      status: audit.status as string,
      createdAt: audit.createdAt as number,
      findings: (findings?.findings ?? []) as Array<{
        severity: string
        title: string
        description?: string
      }>,
    }
  },
})
