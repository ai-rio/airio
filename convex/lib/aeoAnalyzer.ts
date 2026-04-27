'use node'

import Anthropic from '@anthropic-ai/sdk'

export interface CrawledSite {
  url: string
  robotsTxt: string | null
  llmsTxt: string | null
  pages: Array<{ url: string; title: string; content: string; schema: string[] }>
}

export interface AeoFindings {
  score: number
  findings: Array<{ type: string; severity: 'critical' | 'high' | 'medium' | 'low'; message: string }>
  llmsTxt: string
  robotsPatch: string
  schemaBlocks: Array<{ page: string; json: string }>
  rewrittenPassages: Array<{ page: string; original: string; optimized: string }>
}

const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Amazonbot', 'Diffbot']

export function analyzeRobotsTxt(robotsTxt: string | null): {
  blocked: string[]
  patch: string
} {
  if (!robotsTxt) {
    return {
      blocked: AI_CRAWLERS,
      patch: AI_CRAWLERS.map(bot => `User-agent: ${bot}\nAllow: /`).join('\n\n'),
    }
  }

  const blocked: string[] = []
  const lines = robotsTxt.split('\n')
  let currentAgent = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('User-agent:')) {
      currentAgent = trimmed.replace('User-agent:', '').trim()
    }
    if (trimmed.startsWith('Disallow: /') && AI_CRAWLERS.includes(currentAgent)) {
      blocked.push(currentAgent)
    }
  }

  const patch = blocked.length === 0
    ? '# Nenhuma correção necessária. Todos os crawlers de IA estão permitidos.'
    : blocked.map(bot => `# Remova ou altere esta regra:\n# User-agent: ${bot}\n# Disallow: /\n# Para:\nUser-agent: ${bot}\nAllow: /`).join('\n\n')

  return { blocked, patch }
}

export async function runAeoAnalysis(site: CrawledSite, apiKey: string): Promise<AeoFindings> {
  const client = new Anthropic({ apiKey })

  const { blocked, patch: robotsPatch } = analyzeRobotsTxt(site.robotsTxt)

  const hasLlmsTxt = !!site.llmsTxt
  const pagesContent = site.pages.slice(0, 5).map(p =>
    `URL: ${p.url}\nTítulo: ${p.title}\nConteúdo:\n${p.content.slice(0, 1500)}`
  ).join('\n\n---\n\n')

  const prompt = `Você é um especialista em AEO (Answer Engine Optimization) para o mercado brasileiro.

Analise este site e retorne um JSON com a estrutura exata abaixo.

SITE: ${site.url}
TEM llms.txt: ${hasLlmsTxt ? 'Sim' : 'Não'}
CRAWLERS DE IA BLOQUEADOS: ${blocked.length === 0 ? 'Nenhum' : blocked.join(', ')}
PÁGINAS:
${pagesContent}

Retorne APENAS JSON válido com esta estrutura:
{
  "score": <número 0-100>,
  "findings": [
    { "type": "llms_txt_missing"|"robots_blocking"|"no_schema"|"weak_passages"|"no_faq", "severity": "critical"|"high"|"medium"|"low", "message": "<em português>" }
  ],
  "llmsTxt": "<conteúdo completo do arquivo llms.txt gerado>",
  "schemaBlocks": [
    { "page": "<url>", "json": "<JSON-LD schema em string>" }
  ],
  "rewrittenPassages": [
    { "page": "<url>", "original": "<trecho original>", "optimized": "<trecho otimizado para citação por IA>" }
  ]
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returned invalid JSON')

  const parsed = JSON.parse(jsonMatch[0])
  return { ...parsed, robotsPatch }
}
