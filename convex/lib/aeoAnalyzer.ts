'use node';

import { callLlm } from './aeo/llmClient.js';
import { buildPrompt, PROMPT_VERSION } from './aeo/prompt.js';
import { analyzeRobotsTxt } from './aeo/robots.js';
import { computeAlgorithmicScore } from './aeo/score.js';
import { runSeoChecks } from './aeo/seoChecks.js';
import type { AeoFindings, CrawledSite } from './aeo/types.js';

export type { CrawledSite, AeoFindings };
export { analyzeRobotsTxt };

export async function runAeoAnalysis(
  site: CrawledSite,
  apiKey: string,
  model?: string
): Promise<AeoFindings> {
  const { blocked, patch: robotsPatch } = analyzeRobotsTxt(site.robotsTxt);
  const seo = runSeoChecks(site);
  const algorithmicBase = computeAlgorithmicScore(site, blocked, seo.penalty);
  const prompt = buildPrompt(site, blocked, algorithmicBase);
  const parsed = await callLlm(prompt, apiKey, model ?? 'anthropic/claude-sonnet-4-5');

  // Final score: algorithmic base + LLM content-quality adjustment (-20..+20)
  const scoreAdjustment = Math.max(-20, Math.min(20, Number(parsed.scoreAdjustment ?? 0)));
  const score = Math.max(10, Math.min(100, algorithmicBase + scoreAdjustment));

  // Merge algorithmic SEO findings with LLM findings
  const findings = [...seo.findings, ...((parsed.findings as AeoFindings['findings']) ?? [])];

  // deterministic fields from crawler — not delegated to LLM
  const pages = site.pages.map((p) => ({ url: p.url, pageType: p.pageType }));

  return {
    ...parsed,
    score,
    algorithmicBase,
    scoreAdjustment,
    findings,
    robotsPatch,
    pages,
    brandSignals: site.brandSignals,
    rslPresent: !!site.rslTxt,
    promptVersion: PROMPT_VERSION,
  } as AeoFindings;
}
