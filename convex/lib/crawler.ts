'use node';

export type CmsType =
  | 'wordpress'
  | 'webflow'
  | 'wix'
  | 'squarespace'
  | 'shopify'
  | 'ghost'
  | 'other';

export interface BrandSignals {
  wikipedia: string | null;
  reddit: string | null;
  youtube: string | null;
}
export type PageType =
  | 'landing'
  | 'blog'
  | 'howto'
  | 'comparison'
  | 'about'
  | 'product'
  | 'service'
  | 'pricing'
  | 'contact'
  | 'other';

export interface HtmlSignals {
  hasCanonical: boolean;
  hasViewport: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  noindexed: boolean;
  h1Count: number;
  wordCount: number;
  imagesMissingAlt: number;
  hasAuthorSchema: boolean;
  hasDatePublished: boolean;
  hasFaq: boolean;
  hasListsOrTables: boolean;
  hasQuestionHeadings: boolean;
  hasVideo: boolean;
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  schema: string[];
  pageType: PageType;
  htmlSignals: HtmlSignals;
}

export interface CrawlResult {
  robotsTxt: string | null;
  llmsTxt: string | null;
  rslTxt: string | null;
  pages: CrawledPage[];
  cms: CmsType;
  brandSignals: BrandSignals;
}

async function fetchText(url: string, maxBytes?: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Tagsmith-AEO-Audit/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    if (maxBytes) {
      const reader = res.body?.getReader();
      if (!reader) return await res.text();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        total += value.length;
      }
      reader.cancel();
      return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, maxBytes);
    }
    return await res.text();
  } catch {
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000);
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? '';
}

function extractSchemaBlocks(html: string): string[] {
  return [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ].map((m) => m[1].trim());
}

function detectCms(html: string): CmsType {
  const h = html.slice(0, 50000);
  if (/wp-content\/|wp-includes\/|<meta[^>]+generator[^>]+WordPress/i.test(h)) return 'wordpress';
  if (/webflow\.com|data-wf-site/i.test(h)) return 'webflow';
  if (/wix\.com|_wixCssModules/i.test(h)) return 'wix';
  if (/squarespace\.com|static\.squarespace/i.test(h)) return 'squarespace';
  if (/shopify\.com|Shopify\.theme/i.test(h)) return 'shopify';
  if (/<meta[^>]+generator[^>]+Ghost/i.test(h)) return 'ghost';
  return 'other';
}

export function classifyPageType(url: string): PageType {
  const path = new URL(url).pathname.toLowerCase();
  if (path === '/' || path === '') return 'landing';
  if (/\/(blog|post|artigo|noticias?|news|publicacao)(\/|$|-)/.test(path)) return 'blog';
  if (/\/(como|how-to|tutorial|guia|guide|passo-a-passo|howto)(\/|$|-)/.test(path)) return 'howto';
  if (/\/(vs|versus|comparativo|alternativa|alternativas|compare|comparar)(\/|$|-)/.test(path))
    return 'comparison';
  if (/\/(sobre|about|empresa|quem-somos|nossa-historia|equipe|team)(\/|$|-)/.test(path))
    return 'about';
  if (/\/(preco|precos|pricing|planos|plans|assinatura)(\/|$|-)/.test(path)) return 'pricing';
  if (/\/(contato|contact|fale-conosco|suporte|support)(\/|$|-)/.test(path)) return 'contact';
  if (/\/(servico|servicos|service|services|solucao|solucoes)(\/|$|-)/.test(path)) return 'service';
  if (/\/(produto|produtos|product|products|feature|funcionalidade)(\/|$|-)/.test(path))
    return 'product';
  return 'other';
}

async function fetchSitemapUrls(origin: string): Promise<string[]> {
  const xml = await fetchText(`${origin}/sitemap.xml`, 50000);
  if (!xml) return [];
  const locs: string[] = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const u = m[1].trim();
    try {
      const parsed = new URL(u);
      if (
        parsed.origin === origin &&
        !/\.(xml|rss|pdf|jpg|png|gif|svg|css|js)$/i.test(parsed.pathname)
      ) {
        locs.push(u);
      }
    } catch {
      /* skip */
    }
  }
  return locs;
}

function extractNavLinks(html: string, origin: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#?]+)["']/gi)) {
    try {
      const u = new URL(m[1], origin);
      if (u.origin === origin && u.pathname !== '/') urls.push(u.href);
    } catch {
      /* skip */
    }
  }
  return [...new Set(urls)];
}

const KEY_PATH_PATTERNS = [
  '/about',
  '/sobre',
  '/pricing',
  '/preco',
  '/precos',
  '/contact',
  '/contato',
  '/services',
  '/servicos',
  '/blog',
  '/solucoes',
  '/solution',
];

function pickCandidatePages(urls: string[], limit: number): string[] {
  const scored = urls.map((u) => {
    const path = new URL(u).pathname.toLowerCase();
    const isKey = KEY_PATH_PATTERNS.some((k) => path.startsWith(k));
    return { u, score: isKey ? 1 : 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { u } of scored) {
    const path = new URL(u).pathname;
    if (!seen.has(path) && result.length < limit) {
      seen.add(path);
      result.push(u);
    }
  }
  return result;
}

function extractHtmlSignals(html: string, schemas: string[]): HtmlSignals {
  const headEnd = html.indexOf('</head>');
  const head = headEnd > 0 ? html.slice(0, headEnd + 7) : html.slice(0, 8000);
  const body = html.slice(html.indexOf('<body'));

  const hasCanonical = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(head);
  const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(head);
  const hasOgTitle = /<meta[^>]+property=["']og:title["'][^>]*>/i.test(head);
  const hasOgDescription = /<meta[^>]+property=["']og:description["'][^>]*>/i.test(head);
  const noindexed = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(head);

  const h1Count = (body.match(/<h1[\s>]/gi) ?? []).length;
  const wordCount = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
  const imgTags = body.match(/<img[^>]+>/gi) ?? [];
  const imagesMissingAlt = imgTags.filter((t) => !/alt=["'][^"']+["']/i.test(t)).length;

  let hasAuthorSchema = false;
  let hasDatePublished = false;
  for (const s of schemas) {
    try {
      const obj = JSON.parse(s);
      const flat = JSON.stringify(obj);
      if (/"author"/.test(flat)) hasAuthorSchema = true;
      if (/"datePublished"/.test(flat)) hasDatePublished = true;
    } catch {
      /* skip */
    }
  }

  const hasFaq =
    /<(details|summary)|class=["'][^"']*faq[^"']*["']|itemtype=["'][^"']*FAQPage/i.test(body) ||
    /<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/i.test(body);
  const hasListsOrTables = /<(ul|ol|table)[\s>]/i.test(body);
  const hasQuestionHeadings = /<h[2-4][^>]*>[^<]*\?[^<]*<\/h[2-4]>/i.test(body);
  const hasVideo =
    /<(video|iframe)[^>]+(youtube|vimeo|youtu\.be|player)[^>]*>/i.test(body) ||
    /<video[\s>]/i.test(body);

  return {
    hasCanonical,
    hasViewport,
    hasOgTitle,
    hasOgDescription,
    noindexed,
    h1Count,
    wordCount,
    imagesMissingAlt,
    hasAuthorSchema,
    hasDatePublished,
    hasFaq,
    hasListsOrTables,
    hasQuestionHeadings,
    hasVideo,
  };
}

function pageFromHtml(url: string, html: string, pageType: PageType): CrawledPage {
  const schema = extractSchemaBlocks(html);
  return {
    url,
    title: extractTitle(html),
    content: extractTextFromHtml(html),
    schema,
    pageType,
    htmlSignals: extractHtmlSignals(html, schema),
  };
}

async function fetchRenderedSignals(
  url: string
): Promise<{ signals: HtmlSignals; schemas: string[] } | null> {
  const crawlApiUrl = process.env.CRAWL_API_URL;
  const crawlApiSecret = process.env.CRAWL_API_SECRET;
  if (!crawlApiUrl) return null;
  try {
    const res = await fetch(crawlApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(crawlApiSecret ? { 'x-crawl-secret': crawlApiSecret } : {}),
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(35000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { signals: HtmlSignals; schemas: string[] };
    return data;
  } catch {
    return null;
  }
}

function extractBrandParts(origin: string): { brand: string; domain: string } {
  const hostname = new URL(origin).hostname.replace(/^www\./, '');
  return { brand: hostname.split('.')[0], domain: hostname };
}

async function checkWikipedia(domain: string): Promise<string | null> {
  const brand = domain.split('.')[0].toLowerCase();
  try {
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(domain)}&srlimit=1&format=json`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query: { search: Array<{ title: string; pageid: number }> };
    };
    const hit = data.query?.search?.[0];
    if (!hit || !hit.title.toLowerCase().includes(brand)) return null;
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`;
  } catch {
    return null;
  }
}

async function checkReddit(domain: string): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const userAgent = process.env.REDDIT_USER_AGENT ?? 'tagsmith/1.0';
  if (!clientId || !clientSecret) return null;
  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'User-Agent': userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenRes.ok) return null;
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    // Quote the domain for exact-match search
    const q = encodeURIComponent(`"${domain}"`);
    const searchRes = await fetch(`https://oauth.reddit.com/search?q=${q}&limit=1&type=link`, {
      headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': userAgent },
      signal: AbortSignal.timeout(5000),
    });
    if (!searchRes.ok) return null;
    const data = (await searchRes.json()) as {
      data: { dist: number; children: Array<{ data: { permalink: string } }> };
    };
    if ((data.data?.dist ?? 0) === 0) return null;
    const permalink = data.data.children[0]?.data?.permalink;
    return permalink
      ? `https://www.reddit.com${permalink}`
      : `https://www.reddit.com/search/?q=${q}`;
  } catch {
    return null;
  }
}

async function checkYoutube(domain: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(domain)}&type=channel,video&maxResults=1&key=${apiKey}&part=snippet`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pageInfo: { totalResults: number };
      items: Array<{
        id: { kind: string; channelId?: string; videoId?: string };
        snippet: { title: string; channelTitle: string };
      }>;
    };
    if ((data.pageInfo?.totalResults ?? 0) === 0) return null;
    const item = data.items?.[0];
    if (!item) return null;
    // Validate snippet title or channel contains brand substring
    const brand = domain.split('.')[0].toLowerCase();
    const titleMatch =
      item.snippet.title.toLowerCase().includes(brand) ||
      item.snippet.channelTitle.toLowerCase().includes(brand);
    if (!titleMatch) return null;
    if (item.id.kind === 'youtube#channel' && item.id.channelId) {
      return `https://www.youtube.com/channel/${item.id.channelId}`;
    }
    if (item.id.kind === 'youtube#video' && item.id.videoId) {
      return `https://www.youtube.com/watch?v=${item.id.videoId}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchBrandSignals(origin: string): Promise<BrandSignals> {
  const { brand, domain } = extractBrandParts(origin);
  const [wikipedia, reddit, youtube] = await Promise.all([
    checkWikipedia(domain),
    checkReddit(domain),
    checkYoutube(domain),
  ]);
  return { wikipedia, reddit, youtube };
}

export async function crawlSite(baseUrl: string): Promise<CrawlResult> {
  const base = new URL(baseUrl);
  const origin = base.origin;

  const [robotsTxt, llmsTxt, rslTxt, homeHtml, brandSignals] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`, 2048),
    fetchText(`${origin}/rsl.txt`, 1024),
    fetchText(baseUrl),
    fetchBrandSignals(origin),
  ]);

  const cms = homeHtml ? detectCms(homeHtml) : 'other';

  // Try rendered crawl for homepage htmlSignals (detects JS-rendered schema + meta tags)
  const rendered = await fetchRenderedSignals(baseUrl);
  const homePage: CrawledPage | null = homeHtml
    ? {
        ...pageFromHtml(baseUrl, homeHtml, 'landing'),
        ...(rendered
          ? {
              htmlSignals: rendered.signals,
              schema:
                rendered.schemas.length > 0 ? rendered.schemas : extractSchemaBlocks(homeHtml),
            }
          : {}),
      }
    : null;

  const pages: CrawledPage[] = homePage ? [homePage] : [];

  let candidates = await fetchSitemapUrls(origin);
  if (candidates.length === 0 && homeHtml) {
    candidates = extractNavLinks(homeHtml, origin);
  }

  const homeNorm = baseUrl.replace(/\/$/, '');
  const toFetch = pickCandidatePages(
    candidates.filter((u) => u.replace(/\/$/, '') !== homeNorm),
    4
  );

  const extra = await Promise.all(
    toFetch.map(async (u) => {
      const html = await fetchText(u);
      if (!html) return null;
      return pageFromHtml(u, html, classifyPageType(u));
    })
  );
  for (const p of extra) {
    if (p) pages.push(p);
  }

  return { robotsTxt, llmsTxt, rslTxt, pages, cms, brandSignals };
}
