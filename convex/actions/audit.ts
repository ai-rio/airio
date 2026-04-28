'use node'

import dns from 'node:dns'
import { actionGeneric, anyApi } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { crawlSite } from '../lib/crawler.js'
import { runAeoAnalysis } from '../lib/aeoAnalyzer.js'

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fc00:/,
  /^fd[0-9a-f]{2}:/i,
  /^169\.254\./,
]

async function validateUrl(urlString: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(urlString)
  } catch {
    throw new ConvexError('URL inválida')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ConvexError('URL não permitida')
  }
  const hostname = parsed.hostname
  if (PRIVATE_IP_RANGES.some((re) => re.test(hostname))) {
    throw new ConvexError('URL não permitida')
  }
  try {
    const { address } = await dns.promises.lookup(hostname)
    if (PRIVATE_IP_RANGES.some((re) => re.test(address))) {
      throw new ConvexError('URL não permitida')
    }
  } catch (err) {
    if (err instanceof ConvexError) throw err
    throw new ConvexError('URL não permitida')
  }
  return parsed
}

export const runAudit = actionGeneric({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    const identity = await ctx.auth.getUserIdentity()
    const isDev = process.env.AUTH_EMAIL_MOCK === '1' ||
      process.env.CONVEX_DEPLOYMENT?.startsWith('dev:') === true
    if (!identity && !isDev) throw new ConvexError('Não autorizado')

    const validUrl = await validateUrl(url)
    const userId = identity
      ? identity.subject.split('|')[0]
      : (await ctx.runMutation(anyApi.users.getOrCreateUser, { email: 'dev@localhost' })) as string

    const rateLimitAllowed = await ctx.runMutation(
      anyApi.lib.rateLimit.checkRateLimit,
      { key: userId, windowMs: 60_000, limit: 5 }
    )
    if (!rateLimitAllowed) throw new ConvexError('Limite de requisições atingido')

    let billedAs: 'credit' | 'free' = 'free'
    if (!isDev || identity) {
      const gate = (await ctx.runMutation(anyApi.users.checkAndConsumeUsage, {
        userId,
      })) as { allowed: boolean; billedAs?: string; reason?: string }
      if (!gate.allowed) throw new ConvexError(gate.reason ?? 'Sem créditos')
      billedAs = (gate.billedAs ?? 'credit') as 'credit' | 'free'
    }

    const auditId = (await ctx.runMutation(anyApi.audits.createPending, {
      userId,
      url: validUrl.href,
      billedAs,
    })) as string

    const anthropicKey = process.env.OPENROUTER_API_KEY
    if (!anthropicKey) throw new ConvexError('OPENROUTER_API_KEY não configurada')

    try {
      const crawled = await crawlSite(validUrl.href)
      const findings = await runAeoAnalysis(
        { url: validUrl.href, ...crawled },
        anthropicKey,
        process.env.OPENROUTER_MODEL
      )

      await ctx.runMutation(anyApi.audits.markComplete, {
        auditId,
        score: findings.score,
        outputFiles: JSON.stringify(findings),
        promptVersion: findings.promptVersion,
      })
      await ctx.runMutation(anyApi.usageLogs.log, { userId, auditId })

      return { auditId, score: findings.score }
    } catch (err) {
      await ctx.runMutation(anyApi.audits.markFailed, {
        auditId,
        errorMessage: err instanceof Error ? err.message : 'Falha na auditoria',
      })
      throw new ConvexError(err instanceof Error ? err.message : 'Falha na auditoria')
    }
  },
})
