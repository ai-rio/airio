'use node';

import { internalActionGeneric, anyApi } from 'convex/server';
import { internal } from '../_generated/api';
import { ConvexError, v } from 'convex/values';
import { runAeoAnalysis } from '../lib/aeoAnalyzer.js';
import { crawlSite } from '../lib/crawler.js';

export const runDueSiteAudits = internalActionGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const dueSites = (await ctx.runQuery(anyApi.sites.getDueSites, { now })) as Array<{
      _id: string;
      url: string;
    }>;

    for (const site of dueSites) {
      try {
        await ctx.runAction(internal.actions.monitoring.runScheduledAudit, {
          siteId: site._id,
          url: site.url,
        });
      } catch (err) {
        console.error(`Monitoring audit failed for site ${site._id}:`, err);
      }
    }
  },
});

/**
 * Internal action for cron-triggered audits.
 * Bypasses user identity check — caller is trusted (cron via runDueSiteAudits).
 * userId is resolved from the site document (site owner pays credits).
 */
export const runScheduledAudit = internalActionGeneric({
  args: { siteId: v.string(), url: v.string() },
  handler: async (ctx, { siteId, url }) => {
    const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any;
    if (!site) throw new ConvexError('Site não encontrado');

    const userId: string = site.userId;

    // Debit credits from site owner (same gate as manual audits)
    const gate = (await ctx.runMutation(anyApi.users.checkAndConsumeUsage, {
      userId,
    })) as { allowed: boolean; billedAs?: string; reason?: string };
    if (!gate.allowed) throw new ConvexError(gate.reason ?? 'Sem créditos');
    const billedAs = (gate.billedAs ?? 'credit') as 'credit' | 'free';

    const anthropicKey = process.env.OPENROUTER_API_KEY;
    if (!anthropicKey) throw new ConvexError('OPENROUTER_API_KEY não configurada');

    const auditId = (await ctx.runMutation(anyApi.audits.createPending, {
      userId,
      url,
      billedAs,
      siteId,
    })) as string;

    try {
      const crawled = await crawlSite(url);
      const findings = await runAeoAnalysis(
        { url, ...crawled },
        anthropicKey,
        process.env.OPENROUTER_MODEL
      );

      await ctx.runMutation(anyApi.audits.markComplete, {
        auditId,
        score: findings.score,
        outputFiles: JSON.stringify(findings),
        promptVersion: findings.promptVersion,
      });
      await ctx.runMutation(anyApi.usageLogs.log, { userId, auditId });

      const intervalMs =
        site.schedule === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
      await ctx.runMutation(anyApi.sites.updateNextAudit, {
        siteId,
        nextAuditAt: Date.now() + intervalMs,
      });
      await ctx.runAction(anyApi.actions.alerts.checkAndSendAlerts, {
        siteId,
        auditId,
      });

      return { auditId, score: findings.score };
    } catch (err) {
      await ctx.runMutation(anyApi.audits.markFailed, {
        auditId,
        errorMessage: err instanceof Error ? err.message : 'Falha na auditoria',
      });
      throw new ConvexError(err instanceof Error ? err.message : 'Falha na auditoria');
    }
  },
});
