import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

const CRAWL_API_SECRET = process.env.CRAWL_API_SECRET;

export async function POST(req: Request) {
  if (CRAWL_API_SECRET) {
    const auth = req.headers.get('x-crawl-secret');
    if (auth !== CRAWL_API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { url } = (await req.json()) as { url: string };
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      extraHTTPHeaders: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(1500);
    } catch {
      // partial load — still extract what we can
    }

    const html = await page.content();

    const result = await page.evaluate(() => {
      const getMeta = (name: string) =>
        document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? '';
      const getMetaProp = (prop: string) =>
        document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') ?? '';

      const robotsMeta = getMeta('robots').toLowerCase();
      const h1s = document.querySelectorAll('h1');
      const imgs = document.querySelectorAll('img');
      const imagesMissingAlt = Array.from(imgs).filter(
        (img) => !img.getAttribute('alt') || img.getAttribute('alt') === ''
      ).length;

      const schemas: string[] = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map((s) => s.textContent ?? '');

      let hasAuthorSchema = false;
      let hasDatePublished = false;
      for (const s of schemas) {
        if (/"author"/.test(s)) hasAuthorSchema = true;
        if (/"datePublished"/.test(s)) hasDatePublished = true;
      }

      const bodyText = document.body?.innerText ?? '';
      const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

      return {
        signals: {
          hasCanonical: !!document.querySelector('link[rel="canonical"]'),
          hasViewport: !!document.querySelector('meta[name="viewport"]'),
          hasOgTitle: !!getMetaProp('og:title'),
          hasOgDescription: !!getMetaProp('og:description'),
          noindexed: robotsMeta.includes('noindex'),
          h1Count: h1s.length,
          wordCount,
          imagesMissingAlt,
          hasAuthorSchema,
          hasDatePublished,
        },
        schemas: schemas.filter(Boolean),
      };
    });

    return NextResponse.json({ signals: result.signals, schemas: result.schemas });
  } finally {
    await browser.close();
  }
}
