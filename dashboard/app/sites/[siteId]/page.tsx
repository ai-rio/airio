'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { api } from 'airio-convex/_generated/api'
import type { Id } from 'airio-convex/_generated/dataModel'
import { useMutation, useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────

interface AlertConfig {
  scoreDropThreshold: number
  criticalFindings: boolean
  crawlerBlocked: boolean
}

interface Site {
  _id: Id<'sites'>
  name: string
  url: string
  schedule: 'weekly' | 'monthly'
  monitoringEnabled: boolean
  alertConfig: AlertConfig
}

interface Audit {
  _id: Id<'audits'>
  score: number | null
  outputFiles: string | undefined
  _creationTime: number
}

interface Finding {
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-600'
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200'
  if (score >= 40) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  low: 'border-gray-200 bg-gray-50 text-gray-600',
}

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
}

const SCHEDULE_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ audits }: { audits: Audit[] }) {
  const scores = [...audits]
    .reverse()
    .map((a) => a.score)
    .filter((s): s is number => s !== null)

  if (scores.length < 2) {
    return (
      <p className="text-xs text-gray-400 mt-1">
        Dados insuficientes para sparkline
      </p>
    )
  }

  const W = 240
  const H = 60
  const pad = 8

  const minS = Math.min(...scores)
  const maxS = Math.max(...scores)
  const range = maxS - minS || 1

  const toX = (i: number) =>
    pad + (i / (scores.length - 1)) * (W - pad * 2)
  const toY = (s: number) =>
    H - pad - ((s - minS) / range) * (H - pad * 2)

  const points = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-xs h-12"
      aria-label="Histórico de scores"
    >
      <polyline
        points={points}
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {scores.map((s, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(s)}
          r="3"
          fill="#6366f1"
          stroke="white"
          strokeWidth="1.5"
        >
          <title>{s}</title>
        </circle>
      ))}
    </svg>
  )
}

// ── Alert config section ─────────────────────────────────────────────────────

function AlertConfigSection({
  site,
  siteId,
}: {
  site: Site
  siteId: string
}) {
  const updateAlerts = useMutation(api.sites.updateAlertConfig)

  async function toggle(field: 'criticalFindings' | 'crawlerBlocked') {
    await updateAlerts({
      siteId: siteId as Id<'sites'>,
      alertConfig: {
        ...site.alertConfig,
        [field]: !site.alertConfig[field],
      },
    })
  }

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-0">
        {/* Row 1 — score drop, always active */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Queda de score
            </p>
            <p className="text-xs text-gray-500">
              Alerta quando cair {site.alertConfig.scoreDropThreshold}{' '}
              pontos ou mais
            </p>
          </div>
          <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded px-2 py-0.5">
            Ativo
          </span>
        </div>

        <Separator />

        {/* Row 2 — critical findings */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Novos problemas críticos
            </p>
            <p className="text-xs text-gray-500">
              Alerta quando surgir um problema crítico
            </p>
          </div>
          <button
            onClick={() => toggle('criticalFindings')}
            className={cn(
              'text-xs font-medium rounded px-2 py-0.5 border transition-colors',
              site.alertConfig.criticalFindings
                ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
            )}
          >
            {site.alertConfig.criticalFindings ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <Separator />

        {/* Row 3 — crawler blocked */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              Crawler de IA bloqueado
            </p>
            <p className="text-xs text-gray-500">
              Alerta quando robots.txt bloquear crawlers de IA
            </p>
          </div>
          <button
            onClick={() => toggle('crawlerBlocked')}
            className={cn(
              'text-xs font-medium rounded px-2 py-0.5 border transition-colors',
              site.alertConfig.crawlerBlocked
                ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
            )}
          >
            {site.alertConfig.crawlerBlocked ? 'Ativo' : 'Inativo'}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>()
  const router = useRouter()

  const site = useQuery(api.sites.getById, { siteId: siteId as Id<'sites'> })
  const audits = useQuery(api.audits.listBySite, {
    siteId: siteId as Id<'sites'>,
    limit: 12,
  })
  const createReport = useMutation(api.shareableReports.create)

  // Loading state
  if (site === undefined || audits === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando…</p>
      </div>
    )
  }

  // Not found
  if (site === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-sm">Site não encontrado.</p>
      </div>
    )
  }

  const latestAudit = audits[0] as Audit | undefined

  let findings: Finding[] = []
  if (latestAudit?.outputFiles) {
    try {
      const parsed = JSON.parse(latestAudit.outputFiles) as {
        findings?: Finding[]
      }
      findings = parsed.findings ?? []
    } catch {
      // malformed JSON — skip findings
    }
  }

  async function handleShare() {
    if (!latestAudit) return
    try {
      const token = await createReport({
        auditId: latestAudit._id,
        siteId: siteId as Id<'sites'>,
      })
      const url = `${window.location.origin}/report/${token}`
      await navigator.clipboard.writeText(url)
      alert('Link copiado para a área de transferência!')
    } catch {
      alert('Erro ao gerar link de compartilhamento.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
        >
          ← Voltar
        </button>

        {/* Header + score badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900 truncate">
              {site.name}
            </h1>
            <p className="text-sm font-mono text-gray-500 truncate mt-0.5">
              {site.url}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {SCHEDULE_LABEL[site.schedule]} •{' '}
              {site.monitoringEnabled ? (
                <span className="text-green-600">Monitoramento ativo</span>
              ) : (
                <span className="text-gray-400">Monitoramento pausado</span>
              )}
            </p>
          </div>

          {latestAudit?.score != null && (
            <div
              className={cn(
                'shrink-0 flex flex-col items-center justify-center rounded-xl border px-5 py-3',
                scoreBg(latestAudit.score)
              )}
            >
              <span
                className={cn(
                  'text-4xl font-bold tabular-nums',
                  scoreColor(latestAudit.score)
                )}
              >
                {latestAudit.score}
              </span>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">
                Score AEO
              </span>
            </div>
          )}
        </div>

        {/* Score sparkline */}
        {audits.length > 0 && (
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Histórico de scores
              </p>
              <Sparkline audits={audits as Audit[]} />
            </CardContent>
          </Card>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 px-0.5">
              Problemas encontrados
            </p>
            {findings.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border px-4 py-3 text-sm',
                  SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low
                )}
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-semibold uppercase tracking-wide border',
                      SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low
                    )}
                  >
                    {SEVERITY_LABEL[f.severity] ?? f.severity}
                  </Badge>
                  <p className="leading-snug">{f.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alert config */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 px-0.5">
            Configurar alertas
          </p>
          <AlertConfigSection site={site as Site} siteId={siteId} />
        </div>

        {/* Action buttons */}
        {latestAudit && (
          <div className="flex gap-3">
            <Button
              variant="default"
              onClick={() => router.push(`/audit/${latestAudit._id}`)}
              className="flex-1"
            >
              Ver auditoria completa →
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="flex-1"
            >
              Compartilhar relatório
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
