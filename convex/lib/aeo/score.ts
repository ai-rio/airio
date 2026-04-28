import type { CrawledSite } from './types.js';

export function computeAlgorithmicScore(
  site: CrawledSite,
  blocked: string[],
  seoPenalty = 0
): number {
  let score = 100;
  if (!site.llmsTxt) score -= 20;
  if (blocked.length > 0) score -= 25;
  const totalSchemas = site.pages.reduce((n, p) => n + p.schema.length, 0);
  if (totalSchemas === 0) score -= 15;
  const pagesWithoutSchema = site.pages.filter((p) => p.schema.length === 0).length;
  score -= pagesWithoutSchema * 3;
  score -= seoPenalty;
  // brand presence bonus: each platform +3 (max +9), reflects 3x backlink correlation
  const { wikipedia, reddit, youtube } = site.brandSignals;
  score += [wikipedia, reddit, youtube].filter(Boolean).length * 3;
  return Math.max(score, 10);
}
