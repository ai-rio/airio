import type { CrawledSite } from './types.js';

type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SeoFinding {
  type: string;
  severity: Severity;
  message: string;
}

export interface SeoCheckResult {
  findings: SeoFinding[];
  penalty: number;
}

export function runSeoChecks(site: CrawledSite): SeoCheckResult {
  const findings: SeoFinding[] = [];
  let penalty = 0;

  const homepage = site.pages[0];
  const allPages = site.pages;

  // noindex on important content pages only (pagination/tag pages legitimately use noindex)
  const contentTypes = [
    'landing',
    'blog',
    'service',
    'product',
    'about',
    'howto',
    'pricing',
    'contact',
  ];
  for (const p of allPages) {
    if (p.htmlSignals.noindexed && contentTypes.includes(p.pageType)) {
      findings.push({
        type: 'noindex_detected',
        severity: 'critical',
        message: `Página ${p.url} (${p.pageType}) tem meta robots noindex — invisível para crawlers de IA.`,
      });
      penalty += 10;
      break;
    }
  }

  // missing viewport — high (mobile crawlers affected)
  if (homepage && !homepage.htmlSignals.hasViewport) {
    findings.push({
      type: 'mobile_viewport_missing',
      severity: 'high',
      message:
        'Homepage sem meta viewport — crawlers móveis de IA podem não renderizar o conteúdo corretamente.',
    });
    penalty += 5;
  }

  // missing canonical on homepage — high
  if (homepage && !homepage.htmlSignals.hasCanonical) {
    findings.push({
      type: 'canonical_tag_missing',
      severity: 'high',
      message:
        'Homepage sem tag canonical — duplicação de URL pode confundir crawlers de IA sobre a URL canônica a citar.',
    });
    penalty += 6;
  }

  // thin content pages (non-landing, < 300 words)
  const thinPages = allPages.filter(
    (p) => p.pageType !== 'landing' && p.htmlSignals.wordCount < 300 && p.htmlSignals.wordCount > 0
  );
  if (thinPages.length > 0) {
    findings.push({
      type: 'thin_content',
      severity: 'medium',
      message: `${thinPages.length} página(s) com menos de 300 palavras (${thinPages.map((p) => new URL(p.url).pathname).join(', ')}) — conteúdo insuficiente para citação por IA.`,
    });
    penalty += Math.min(thinPages.length * 3, 9);
  }

  // missing OG tags on homepage
  if (homepage && (!homepage.htmlSignals.hasOgTitle || !homepage.htmlSignals.hasOgDescription)) {
    findings.push({
      type: 'missing_og_tags',
      severity: 'low',
      message:
        'Homepage sem Open Graph tags completas — dados de preview incompletos para compartilhamento e citação em plataformas de IA.',
    });
    penalty += 2;
  }

  // broken H1 on homepage (0 or >1)
  if (homepage) {
    if (homepage.htmlSignals.h1Count === 0) {
      findings.push({
        type: 'heading_hierarchy_broken',
        severity: 'medium',
        message:
          'Homepage sem H1 — crawlers de IA não conseguem identificar o tópico principal da página.',
      });
      penalty += 5;
    } else if (homepage.htmlSignals.h1Count > 1) {
      findings.push({
        type: 'heading_hierarchy_broken',
        severity: 'low',
        message: `Homepage com ${homepage.htmlSignals.h1Count} tags H1 — hierarquia de cabeçalhos ambígua dificulta extração semântica por IA.`,
      });
      penalty += 2;
    }
  }

  // images missing alt text (only flag if significant)
  const totalMissingAlt = allPages.reduce((n, p) => n + p.htmlSignals.imagesMissingAlt, 0);
  if (totalMissingAlt >= 3) {
    findings.push({
      type: 'missing_alt_text',
      severity: 'low',
      message: `${totalMissingAlt} imagem(ns) sem texto alternativo — contexto visual perdido para IA multimodal.`,
    });
    penalty += 3;
  }

  // blog/article pages missing author schema
  const articlePages = allPages.filter((p) => p.pageType === 'blog' || p.pageType === 'howto');
  const articlesMissingAuthor = articlePages.filter((p) => !p.htmlSignals.hasAuthorSchema);
  if (articlesMissingAuthor.length > 0) {
    findings.push({
      type: 'missing_author_attribution',
      severity: 'medium',
      message: `${articlesMissingAuthor.length} artigo(s) sem schema de autor — E-E-A-T fraco reduz credibilidade e chance de citação por IA.`,
    });
    penalty += 5;
  }

  // blog pages missing datePublished
  const articlesMissingDate = articlePages.filter((p) => !p.htmlSignals.hasDatePublished);
  if (articlesMissingDate.length > 0) {
    findings.push({
      type: 'missing_publish_date',
      severity: 'low',
      message: `${articlesMissingDate.length} artigo(s) sem datePublished no schema — IA não consegue avaliar frescor do conteúdo.`,
    });
    penalty += 4;
  }

  // brand signal analysis: mentions correlate with AI visibility more than backlinks
  const { wikipedia, reddit, youtube } = site.brandSignals;
  const brandCount = [wikipedia, reddit, youtube].filter(Boolean).length;
  if (brandCount === 0) {
    findings.push({
      type: 'no_brand_presence',
      severity: 'high',
      message:
        'Marca sem presença detectada no Wikipedia, Reddit ou YouTube — menções de marca são fator crítico de visibilidade em buscas por IA.',
    });
    penalty += 10;
  } else if (brandCount === 1) {
    findings.push({
      type: 'weak_brand_presence',
      severity: 'medium',
      message: `Presença de marca limitada (${[wikipedia && 'Wikipedia', reddit && 'Reddit', youtube && 'YouTube'].filter(Boolean).join(', ')}) — expandir para mais plataformas aumenta citações por IA.`,
    });
    penalty += 4;
  }

  // RSL 1.0 absent (machine-readable AI licensing — Dec 2025 standard)
  if (!site.rslTxt) {
    findings.push({
      type: 'no_rsl_licensing',
      severity: 'low',
      message:
        'Arquivo /rsl.txt ausente — padrão RSL 1.0 (Reddit, Cloudflare, Creative Commons) sinaliza termos de licença legíveis por IA.',
    });
    penalty += 1;
  }

  // no video/multimedia (GEO: 156% higher AI selection rate with multimodal content)
  const hasMultimedia = allPages.some((p) => p.htmlSignals.hasVideo);
  if (!hasMultimedia) {
    findings.push({
      type: 'no_multimedia_content',
      severity: 'low',
      message:
        'Nenhum vídeo detectado — conteúdo multimodal aumenta em 156% a taxa de seleção por IA.',
    });
    penalty += 2;
  }

  // no FAQ / question headings on content pages (GEO: high AI citation rate)
  const contentPages = allPages.filter((p) =>
    ['landing', 'service', 'product', 'about'].includes(p.pageType)
  );
  const hasSiteFaq = allPages.some((p) => p.htmlSignals.hasFaq);
  if (!hasSiteFaq && contentPages.length > 0) {
    findings.push({
      type: 'no_faq_section',
      severity: 'medium',
      message:
        'Nenhuma seção FAQ ou heading com pergunta encontrada — perguntas e respostas aumentam drasticamente a chance de citação por IA.',
    });
    penalty += 5;
  }

  // no lists or tables anywhere (structural readability signal)
  const hasStructure = allPages.some((p) => p.htmlSignals.hasListsOrTables);
  if (!hasStructure) {
    findings.push({
      type: 'no_structured_content',
      severity: 'low',
      message:
        'Nenhuma lista ou tabela detectada — conteúdo sem estrutura visual reduz citabilidade por IA em 40%+.',
    });
    penalty += 3;
  }

  return { findings, penalty };
}
