import type { CmsType, CrawledSite } from './types.js';

export const PROMPT_VERSION = 'v2';

function getCmsBlock(cms: CmsType): string {
  switch (cms) {
    case 'wordpress':
      return `CMS: WordPress
Para cmsInstructions, forneça passos específicos para WordPress: configuração no Yoast SEO ou RankMath, snippets de functions.php, ou edições no wp-config.php. Cada step deve ser acionável sem desenvolvimento customizado.`;
    case 'webflow':
      return `CMS: Webflow
Para cmsInstructions, use o painel Webflow: Custom Code (Settings > Custom Code > Head/Footer), Webflow CMS para structured data, ou embed de código nas páginas. Sem servidor.`;
    case 'wix':
      return `CMS: Wix
Para cmsInstructions, use Wix SEO Settings, Velo by Wix para código customizado (wix-window, $w), ou o painel nativo de SEO/schema. Sem arquivos de servidor.`;
    case 'squarespace':
      return `CMS: Squarespace
Para cmsInstructions, use Code Injection (Settings > Advanced > Code Injection) para JSON-LD no <head>, ou blocos de código embutidos nas páginas.`;
    case 'shopify':
      return `CMS: Shopify
Para cmsInstructions, edite theme.liquid para JSON-LD no <head>, ou use apps de SEO (JSON-LD for SEO, Schema Plus). Indique edições via Shopify Admin > Themes > Edit code.`;
    case 'ghost':
      return `CMS: Ghost
Para cmsInstructions, use Code Injection (Settings > Code Injection) para scripts no head/footer, ou edite arquivos de tema Handlebars (.hbs).`;
    default:
      return `CMS: desconhecido — site provavelmente custom/headless (Next.js, Nuxt, Gatsby, ou similar)
Para cmsInstructions, forneça código para implementação direta no framework: JSON-LD em arquivos de layout (ex: app/layout.tsx, _document.tsx, nuxt.config.ts), meta tags via componente <Head>, ou edições em arquivos estáticos (robots.txt, public/). NÃO use funções ou padrões WordPress (functions.php, Yoast, RankMath).`;
  }
}

export function buildPrompt(site: CrawledSite, blocked: string[], algorithmicBase: number): string {
  const hasLlmsTxt = !!site.llmsTxt;

  const pagesContent = site.pages
    .slice(0, 5)
    .map((p) => {
      const schemaTypes = p.schema.flatMap((s) => {
        try {
          const obj = JSON.parse(s);
          return (
            obj['@graph']?.map((x: { '@type'?: string }) => x['@type']).filter(Boolean) ??
            (obj['@type'] ? [obj['@type']] : [])
          );
        } catch {
          return [];
        }
      });
      const signals = p.htmlSignals
        ? `FAQ/Perguntas: ${p.htmlSignals.hasFaq ? 'sim' : 'não'} | Listas/tabelas: ${p.htmlSignals.hasListsOrTables ? 'sim' : 'não'} | Vídeo: ${p.htmlSignals.hasVideo ? 'sim' : 'não'} | Palavras: ${p.htmlSignals.wordCount}`
        : '';
      return `URL: ${p.url}\nTipo: ${p.pageType}\nTítulo: ${p.title}\nSchema existente: ${schemaTypes.length ? schemaTypes.join(', ') : 'nenhum'}\n${signals}\nConteúdo:\n${p.content.slice(0, 3000)}`;
    })
    .join('\n\n---\n\n');

  const cmsBlock = getCmsBlock(site.cms);

  const { wikipedia, reddit, youtube } = site.brandSignals ?? {
    wikipedia: false,
    reddit: false,
    youtube: false,
  };
  const brandPresence = [wikipedia && 'Wikipedia', reddit && 'Reddit', youtube && 'YouTube'].filter(
    Boolean
  );

  return `Você é um especialista em AEO (Answer Engine Optimization) para o mercado brasileiro.

Analise este site e retorne um JSON com a estrutura exata abaixo.

SITE: ${site.url}
${cmsBlock}
TEM llms.txt: ${hasLlmsTxt ? 'Sim' : 'Não'}
PRESENÇA DE MARCA: ${brandPresence.length === 0 ? 'Nenhuma detectada (Wikipedia, Reddit, YouTube)' : brandPresence.join(', ')}
CRAWLERS DE IA BLOQUEADOS: ${blocked.length === 0 ? 'Nenhum' : blocked.join(', ')}
SCORE BASE (calculado algoritmicamente): ${algorithmicBase}/100
PÁGINAS CRAWLEADAS (tipo já classificado):
${pagesContent}

Retorne APENAS JSON válido com esta estrutura:
{
  "scoreAdjustment": <inteiro -20 a +20, baseado APENAS na qualidade do conteúdo para citação por IA>,
  "findings": [
    { "type": "<tipo único e específico para ESTE site>", "severity": "critical"|"high"|"medium"|"low", "message": "<problema específico encontrado neste site, em português, com evidência do conteúdo crawleado>" }
  ],
  "llmsTxt": "<conteúdo completo do arquivo llms.txt gerado>",
  "schemaBlocks": [
    { "page": "<url>", "pageType": "<tipo>", "json": "<JSON-LD schema em string>" }
  ],
  "rewrittenPassages": [
    { "page": "<url>", "original": "<trecho original>", "optimized": "<trecho otimizado para citação por IA>" }
  ],
  "cmsInstructions": [
    { "step": "<descrição do passo>", "code": "<código em UMA linha — use \\n para quebras, escape aspas com \\\\"  >", "tool": "yoast|rankmath|functions.php|app/layout.tsx|next.config.js|nuxt.config.ts|theme.liquid|code-injection|robots.txt|other" }
  ]
}

TIPOS DE FINDING disponíveis (escolha os 3-5 mais relevantes para ESTE site específico, não use todos):
llms_txt_missing, robots_blocking, no_schema, weak_passages, no_faq,
no_author_bio, thin_content, no_about_page, no_contact_schema, missing_breadcrumbs,
no_case_studies, no_social_proof_schema, llms_txt_outdated, no_howto_schema,
missing_organization_schema, no_service_schema, no_product_schema, no_review_schema,
weak_about_content, no_structured_faq, missing_local_schema,
no_question_headings, no_multimedia_content, weak_passage_length, no_unique_data,
no_rsl_licensing

REGRAS:
- scoreAdjustment avalia APENAS qualidade de conteúdo (clareza, profundidade, citabilidade por IA)
- Cada finding deve citar EVIDÊNCIA específica do conteúdo crawleado deste site
- NÃO repita findings genéricos que se aplicariam a qualquer site
- message em português, com nome do site ou URL específica quando possível
- o campo "code" deve ser JSON válido — use \\n para quebras, \\" para aspas, sem caracteres de controle
- Máximo 2 schemaBlocks, 2 rewrittenPassages, 3 cmsInstructions. JSON sem espaços extras.`;
}
