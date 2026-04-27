'use node'

export interface CrawledPage {
  url: string
  title: string
  content: string
  schema: string[]
}

export interface CrawlResult {
  robotsTxt: string | null
  llmsTxt: string | null
  pages: CrawledPage[]
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AIRio-AEO-Audit/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3000)
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() ?? ''
}

function extractSchemaBlocks(html: string): string[] {
  const schemas: string[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    schemas.push(match[1].trim())
  }
  return schemas
}

async function crawlPage(url: string): Promise<CrawledPage | null> {
  const html = await fetchText(url)
  if (!html) return null
  return {
    url,
    title: extractTitle(html),
    content: extractTextFromHtml(html),
    schema: extractSchemaBlocks(html),
  }
}

export async function crawlSite(baseUrl: string): Promise<CrawlResult> {
  const base = new URL(baseUrl)
  const origin = base.origin

  const [robotsTxt, llmsTxt, homePage] = await Promise.all([
    fetchText(`${origin}/robots.txt`),
    fetchText(`${origin}/llms.txt`),
    crawlPage(baseUrl),
  ])

  const pages: CrawledPage[] = []
  if (homePage) pages.push(homePage)

  return { robotsTxt, llmsTxt, pages }
}
