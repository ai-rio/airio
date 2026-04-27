'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { use } from 'react'

interface AeoOutput {
  score: number
  findings: Array<{ type: string; severity: string; message: string }>
  llmsTxt: string
  robotsPatch: string
  schemaBlocks: Array<{ page: string; json: string }>
  rewrittenPassages: Array<{ page: string; original: string; optimized: string }>
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

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const audit = useQuery(api.audits.getById, { auditId: id })

  if (!audit) return <p className="p-8 text-sm text-gray-500">Carregando…</p>
  if (audit.status === 'pending') return <p className="p-8 text-sm text-gray-500">Auditando seu site…</p>
  if (audit.status === 'failed') return <p className="p-8 text-sm text-red-600">Falha: {audit.errorMessage}</p>

  const output: AeoOutput = JSON.parse(audit.outputFiles ?? '{}')
  const scoreColor = output.score >= 70 ? 'text-green-600' : output.score >= 40 ? 'text-yellow-600' : 'text-red-600'

  return (
    <main className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div>
        <p className="text-sm text-gray-500 mb-1">{audit.url}</p>
        <h1 className="text-4xl font-bold">
          Score AEO: <span className={scoreColor}>{output.score}/100</span>
        </h1>
      </div>

      {/* Findings */}
      <section>
        <h2 className="font-semibold mb-3">Problemas encontrados</h2>
        <ul className="space-y-2">
          {output.findings?.map((f, i) => (
            <li key={i} className={`text-sm p-3 rounded-lg border ${
              f.severity === 'critical' ? 'border-red-200 bg-red-50' :
              f.severity === 'high' ? 'border-orange-200 bg-orange-50' :
              'border-yellow-200 bg-yellow-50'
            }`}>
              <span className="font-medium capitalize">{f.severity}:</span> {f.message}
            </li>
          ))}
        </ul>
      </section>

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
