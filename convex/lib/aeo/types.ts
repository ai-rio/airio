import type { BrandSignals, CmsType, HtmlSignals, PageType } from '../crawler.js';

export type { BrandSignals, CmsType, PageType, HtmlSignals };

export interface CrawledSite {
  url: string;
  robotsTxt: string | null;
  llmsTxt: string | null;
  rslTxt: string | null;
  brandSignals: BrandSignals;
  pages: Array<{
    url: string;
    title: string;
    content: string;
    schema: string[];
    pageType: PageType;
    htmlSignals: HtmlSignals;
  }>;
  cms: CmsType;
}

export interface AeoFindings {
  score: number;
  algorithmicBase: number;
  scoreAdjustment: number;
  findings: Array<{
    type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
  }>;
  pages: Array<{ url: string; pageType: PageType }>;
  brandSignals: BrandSignals;
  llmsTxt: string;
  robotsPatch: string;
  rslPresent: boolean;
  schemaBlocks: Array<{ page: string; pageType: PageType; json: string }>;
  rewrittenPassages: Array<{ page: string; original: string; optimized: string }>;
  cmsInstructions: Array<{ step: string; code: string; tool: string }>;
  promptVersion: string;
}
