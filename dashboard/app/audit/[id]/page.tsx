'use client'

import { useQuery } from 'convex/react'
import { api } from 'airio-convex/_generated/api'
import { use } from 'react'

interface BrandSignals {
  wikipedia: string | null
  reddit: string | null
  youtube: string | null
}

interface AeoOutput {
  score: number
  algorithmicBase: number
  scoreAdjustment: number
  findings: Array<{ type: string; severity: string; message: string }>
  pages: Array<{ url: string; pageType: string }>
  brandSignals: BrandSignals
  rslPresent: boolean
  llmsTxt: string
  robotsPatch: string
  schemaBlocks: Array<{ page: string; json: string }>
  rewrittenPassages: Array<{ page: string; original: string; optimized: string }>
  cmsInstructions: Array<{ step: string; code: string; tool: string }>
}

function downloadFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  low: 'border-gray-200 bg-gray-50 text-gray-600',
}

const PAGE_TYPE_LABEL: Record<string, string> = {
  landing: 'Home',
  blog: 'Blog',
  howto: 'Tutorial',
  comparison: 'Comparativo',
  about: 'Sobre',
  product: 'Produto',
  service: 'Serviço',
  pricing: 'Preços',
  contact: 'Contato',
  other: 'Outro',
}

const TOOL_LABEL: Record<string, string> = {
  yoast: 'Yoast SEO',
  rankmath: 'RankMath',
  'functions.php': 'functions.php',
  'robots.txt': 'robots.txt',
  'app/layout.tsx': 'app/layout.tsx',
  'next.config.js': 'next.config.js',
  'nuxt.config.ts': 'nuxt.config.ts',
  'theme.liquid': 'theme.liquid',
  'code-injection': 'Code Injection',
  other: 'Manual',
}

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const audit = useQuery(api.audits.getById, { auditId: id })

  if (!audit) return <p className="p-8 text-sm text-gray-500">Carregando…</p>
  if (audit.status === 'pending') return <p className="p-8 text-sm text-gray-500">Auditando seu site…</p>
  if (audit.status === 'failed') return <p className="p-8 text-sm text-red-600">Falha: {audit.errorMessage}</p>

  const output: AeoOutput = JSON.parse(audit.outputFiles ?? '{}')
  const score = output.score ?? 0
  const scoreColor = score >= 70 ? 'text-green-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600'

  const criticalCount = output.findings?.filter(f => f.severity === 'critical').length ?? 0
  const highCount = output.findings?.filter(f => f.severity === 'high').length ?? 0

  return (
    <main className="max-w-2xl mx-auto py-12 px-4 space-y-8">

      {/* Score header */}
      <div>
        <p className="text-sm text-gray-500 mb-1">{audit.url}</p>
        <h1 className="text-4xl font-bold">
          Score AEO: <span className={scoreColor}>{score}/100</span>
        </h1>
        {(output.algorithmicBase != null) && (
          <p className="text-xs text-gray-400 mt-2">
            Base algorítmica {output.algorithmicBase}
            {output.scoreAdjustment != null && output.scoreAdjustment !== 0 && (
              <span className={output.scoreAdjustment > 0 ? 'text-green-500' : 'text-red-500'}>
                {' '}{output.scoreAdjustment > 0 ? '+' : ''}{output.scoreAdjustment} ajuste de conteúdo (IA)
              </span>
            )}
          </p>
        )}
        {(criticalCount > 0 || highCount > 0) && (
          <p className="text-xs text-red-500 mt-1">
            {criticalCount > 0 && `${criticalCount} crítico${criticalCount > 1 ? 's' : ''}`}
            {criticalCount > 0 && highCount > 0 && ' · '}
            {highCount > 0 && `${highCount} alta prioridade`}
          </p>
        )}
      </div>

      {/* Brand signals */}
      {output.brandSignals && (
        <section>
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="font-semibold">Presença de marca</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['wikipedia', 'reddit', 'youtube'] as const).map(platform => {
              const url = output.brandSignals[platform]
              return url ? (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm hover:bg-green-100 transition-colors"
                >
                  <span>✓</span>
                  <span className="capitalize">{platform}</span>
                  <span className="text-green-500 text-xs">↗</span>
                </a>
              ) : (
                <div key={platform} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm">
                  <span>✗</span>
                  <span className="capitalize">{platform}</span>
                </div>
              )
            })}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              output.rslPresent ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-400'
            }`}>
              <span>{output.rslPresent ? '✓' : '✗'}</span>
              <span>RSL 1.0</span>
            </div>
          </div>
        </section>
      )}

      {/* Findings */}
      <section>
        <h2 className="font-semibold mb-3">Problemas encontrados</h2>
        <ul className="space-y-2">
          {output.findings?.map((f, i) => (
            <li key={i} className={`text-sm p-3 rounded-lg border ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low}`}>
              <span className="font-medium capitalize">{f.severity}:</span> {f.message}
            </li>
          ))}
        </ul>
      </section>

      {/* CMS Instructions */}
      {output.cmsInstructions?.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Passos de implementação</h2>
          <ol className="space-y-3">
            {output.cmsInstructions.map((ins, i) => (
              <li key={i} className="border rounded-lg overflow-hidden text-sm">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                  <span className="font-medium">{i + 1}. {ins.step}</span>
                  <span className="text-xs text-gray-400 bg-white border rounded px-2 py-0.5">
                    {TOOL_LABEL[ins.tool] ?? ins.tool}
                  </span>
                </div>
                {ins.code && (
                  <pre className="p-3 text-xs bg-gray-900 text-green-400 overflow-x-auto whitespace-pre-wrap">
                    {ins.code.replace(/\\n/g, '\n').replace(/\\"/g, '"')}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Downloads */}
      <section>
        <h2 className="font-semibold mb-3">Arquivos gerados</h2>
        <div className="grid grid-cols-2 gap-3">
          <DownloadCard
            title="llms.txt"
            description="Para ChatGPT, Claude, Perplexity"
            onClick={() => downloadFile(output.llmsTxt, 'llms.txt')}
          />
          <DownloadCard
            title="robots.txt (patch)"
            description="Desbloqueia crawlers de IA"
            onClick={() => downloadFile(output.robotsPatch, 'robots-patch.txt')}
          />
          {output.schemaBlocks?.length > 0 && (
            <DownloadCard
              title="Schema JSON-LD"
              description={`${output.schemaBlocks.length} bloco(s) gerado(s)`}
              onClick={() => downloadFile(
                output.schemaBlocks.map(s => s.json).join('\n\n'),
                'schema.jsonld',
                'application/ld+json'
              )}
            />
          )}
        </div>
      </section>

      {/* Rewritten passages */}
      {output.rewrittenPassages?.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Trechos otimizados para IA</h2>
          <div className="space-y-4">
            {output.rewrittenPassages.map((p, i) => (
              <div key={i} className="border rounded-lg overflow-hidden text-sm">
                <div className="bg-red-50 p-3 border-b">
                  <p className="text-xs font-medium text-red-600 mb-1">Original</p>
                  <p className="text-gray-700">{p.original}</p>
                </div>
                <div className="bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-600 mb-1">Otimizado para IA</p>
                  <p className="text-gray-700">{p.optimized}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pages crawled */}
      {output.pages?.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Páginas analisadas</h2>
          <ul className="space-y-1">
            {output.pages.map((p, i) => (
              <li key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <span className="text-gray-600 truncate mr-4">{new URL(p.url).pathname || '/'}</span>
                <span className="text-xs text-gray-400 shrink-0 bg-gray-100 rounded px-2 py-0.5">
                  {PAGE_TYPE_LABEL[p.pageType] ?? p.pageType}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </main>
  )
}

function DownloadCard({ title, description, onClick }: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="border rounded-lg p-4 text-left hover:bg-gray-50 transition-colors"
    >
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      <p className="text-xs text-blue-600 mt-2">↓ Baixar</p>
    </button>
  )
}
