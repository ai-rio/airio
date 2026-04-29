'use node';

import { internalActionGeneric } from 'convex/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { detectBrand } from '../lib/geo/brandDetection.js';
import { samplePerplexity } from '../lib/geo/sampler.js';
import { computePsos, wilsonCI } from '../lib/geo/stats.js';

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 24;

export const runDueGeoChecks = internalActionGeneric({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sites = (await ctx.runQuery(internal.sites.getDueSitesForGeo, { now })) as Array<{
      _id: string;
    }>;
    for (const site of sites) {
      await ctx.scheduler.runAfter(0, internal.actions.geoMonitoring.runSiteGeoCheck, {
        siteId: site._id,
      });
    }
  },
});

export const runSiteGeoCheck = internalActionGeneric({
  args: { siteId: v.string() },
  handler: async (ctx, { siteId }) => {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

    const baskets = (await ctx.runQuery(internal.promptBaskets.internalListBySite, {
      siteId: siteId as any,
    })) as Array<{
      _id: string;
      brandName: string;
      prompts: string[];
      engine: string;
      runsPerPrompt: number;
      enabled: boolean;
    }>;

    const enabledBaskets = baskets.filter((b) => b.enabled);
    if (enabledBaskets.length === 0) return;

    for (const basket of enabledBaskets) {
      const detectionResults: boolean[] = [];

      for (const prompt of basket.prompts) {
        const rawSamples = await samplePerplexity(apiKey, prompt, basket.runsPerPrompt);

        for (const raw of rawSamples) {
          const brandDetected = detectBrand(raw.responseText, basket.brandName);
          detectionResults.push(brandDetected);

          await ctx.runMutation(internal.visibilitySnapshots.insert, {
            siteId: siteId as any,
            basketId: basket._id as any,
            engine: basket.engine,
            prompt,
            runIndex: raw.runIndex,
            brandDetected,
            responseSnippet: raw.responseText.slice(0, 500),
            sampledAt: Date.now(),
          });
        }
      }

      const citationCount = detectionResults.filter(Boolean).length;
      const totalSamples = detectionResults.length;
      const psos = computePsos(citationCount, totalSamples);
      const { lower: ciLower, upper: ciUpper } = wilsonCI(citationCount, totalSamples);

      const reportId = (await ctx.runMutation(internal.visibilityReports.insert, {
        siteId: siteId as any,
        basketId: basket._id as any,
        engine: basket.engine,
        psos,
        ciLower,
        ciUpper,
        totalSamples,
        citationCount,
        windowDays: WINDOW_DAYS,
        generatedAt: Date.now(),
      })) as string;

      await ctx.runAction(internal.actions.alerts.checkAndSendPsosAlert, {
        siteId,
        reportId,
      });
    }

    await ctx.runMutation(internal.sites.updateNextGeoCheck, {
      siteId,
      nextGeoCheckAt: Date.now() + WEEKLY_MS,
    });
  },
});
