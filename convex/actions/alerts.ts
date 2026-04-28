'use node';

import { actionGeneric, anyApi, internalActionGeneric } from 'convex/server';
import { v } from 'convex/values';

async function sendEmail(apiKey: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'airio <alertas@ai.rio.br>', to, subject, html }),
  });
  if (!res.ok) console.error('Resend error:', await res.text());
}

export const checkAndSendAlerts = actionGeneric({
  args: { siteId: v.string(), auditId: v.string() },
  handler: async (ctx, { siteId }) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;

    const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any;
    if (!site) return;

    const audits = (await ctx.runQuery(anyApi.audits.listBySite, { siteId, limit: 2 })) as any[];
    if (audits.length < 2) return;

    const current = audits[0];
    const previous = audits[1];
    if (!current?.outputFiles || !previous?.outputFiles) return;

    const curr = JSON.parse(current.outputFiles);
    const prev = JSON.parse(previous.outputFiles);

    const user = (await ctx.runQuery(anyApi.users.getById, { userId: site.userId })) as any;
    if (!user?.email) return;

    const detailUrl = `https://app.ai.rio.br/sites/${siteId}`;

    if (
      typeof current.score === 'number' &&
      typeof previous.score === 'number' &&
      previous.score - current.score >= site.alertConfig.scoreDropThreshold
    ) {
      await sendEmail(
        resendKey,
        user.email,
        `⚠ Score caiu de ${previous.score} para ${current.score} em ${site.name}`,
        `<p>Score AEO de <strong>${site.name}</strong> caiu de <strong>${previous.score}</strong> para <strong>${current.score}</strong>.</p><p><a href="${detailUrl}">Ver detalhes →</a></p>`
      );
    }

    if (site.alertConfig.criticalFindings) {
      const prevCriticalIds = new Set(
        ((prev.findings ?? []) as any[])
          .filter((f: any) => f.severity === 'critical')
          .map((f: any) => f.id ?? f.title)
      );
      const newCritical = ((curr.findings ?? []) as any[]).filter(
        (f: any) => f.severity === 'critical' && !prevCriticalIds.has(f.id ?? f.title)
      );
      if (newCritical.length > 0) {
        await sendEmail(
          resendKey,
          user.email,
          `🚨 Novo problema crítico em ${site.name}`,
          `<p><strong>${newCritical.length} novo(s) problema(s) crítico(s)</strong> em <strong>${site.name}</strong>.</p><ul>${newCritical.map((f: any) => `<li>${f.title ?? f.id}</li>`).join('')}</ul><p><a href="${detailUrl}">Ver detalhes →</a></p>`
        );
      }
    }

    if (site.alertConfig.crawlerBlocked) {
      const prevBlocked = new Set(
        ((prev.robotsPatch ?? []) as any[]).filter((r: any) => r.blocked).map((r: any) => r.bot)
      );
      const newlyBlocked = ((curr.robotsPatch ?? []) as any[]).filter(
        (r: any) => r.blocked && !prevBlocked.has(r.bot)
      );
      for (const r of newlyBlocked) {
        await sendEmail(
          resendKey,
          user.email,
          `🤖 ${r.bot} bloqueado em ${site.name}`,
          `<p><strong>${r.bot}</strong> foi bloqueado em <strong>${site.name}</strong>.</p><p><a href="${detailUrl}">Ver instruções →</a></p>`
        );
      }
    }
  },
});

export const checkAndSendPsosAlert = internalActionGeneric({
  args: { siteId: v.string(), reportId: v.string() },
  handler: async (ctx, { siteId, reportId: _reportId }) => {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return;

    const site = (await ctx.runQuery(anyApi.sites.getById, { siteId })) as any;
    if (!site) return;

    const threshold: number = site.alertConfig?.psosDropThreshold ?? 0.15;

    const reports = (await ctx.runQuery(anyApi.visibilityReports.listBySite, {
      siteId: siteId as any,
      limit: 2,
    })) as any[];
    if (reports.length < 2) return;

    const current = reports[0];
    const previous = reports[1];
    const drop = previous.psos - current.psos;
    if (drop < threshold) return;

    const user = (await ctx.runQuery(anyApi.users.getById, { userId: site.userId })) as any;
    if (!user?.email) return;

    const pct = (val: number) => `${Math.round(val * 100)}%`;
    const detailUrl = `https://app.ai.rio.br/sites/${siteId}`;

    await sendEmail(
      resendKey,
      user.email,
      `⚠ Visibilidade GEO caiu de ${pct(previous.psos)} para ${pct(current.psos)} em ${site.name}`,
      `<p>PSOS de <strong>${site.name}</strong> caiu de <strong>${pct(previous.psos)}</strong> para <strong>${pct(current.psos)}</strong>.</p>` +
        `<p>IC 95%: ${pct(current.ciLower)}–${pct(current.ciUpper)} · ${current.citationCount}/${current.totalSamples} amostras</p>` +
        `<p><a href="${detailUrl}">Ver detalhes →</a></p>`
    );
  },
});
