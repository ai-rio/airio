'use client';

import { PsosGauge } from '@/components/psos-gauge';
import { PsosSparkline } from '@/components/psos-sparkline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useParams, useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

interface AlertConfig {
  scoreDropThreshold: number;
  criticalFindings: boolean;
  crawlerBlocked: boolean;
}

interface Site {
  _id: Id<'sites'>;
  name: string;
  url: string;
  schedule: 'weekly' | 'monthly';
  monitoringEnabled: boolean;
  alertConfig: AlertConfig;
}

interface Audit {
  _id: Id<'audits'>;
  score: number | null;
  outputFiles: string | undefined;
  _creationTime: number;
}

interface VisibilityReport {
  _id: Id<'visibilityReports'>;
  psos: number;
  ciLower: number;
  ciUpper: number;
  citationCount: number;
  totalSamples: number;
  generatedAt: number;
}

interface Finding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return 'text-[var(--brand-success)]';
  if (score >= 40) return 'text-[var(--brand-warning)]';
  return 'text-[var(--brand-danger)]';
}

function scoreBg(score: number): string {
  if (score >= 70) return 'bg-[var(--brand-success-muted)] border-[var(--brand-success-border)]';
  if (score >= 40) return 'bg-[var(--brand-warning-muted)] border-[var(--brand-warning-border)]';
  return 'bg-[var(--brand-danger-muted)] border-[var(--brand-danger-border)]';
}

const SEVERITY_STYLE: Record<string, string> = {
  critical:
    'border-[var(--brand-danger-border)] bg-[var(--brand-danger-muted)] text-[var(--brand-danger)]',
  high: 'border-[var(--brand-warning-border)] bg-[var(--brand-warning-muted)] text-[var(--brand-warning)]',
  medium:
    'border-[var(--brand-warning-border)] bg-[var(--brand-warning-muted)] text-[var(--brand-warning)]',
  low: 'border-border bg-muted text-muted-foreground',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const SCHEDULE_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
};

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ audits }: { audits: Audit[] }) {
  const scores = [...audits]
    .reverse()
    .map((a) => a.score)
    .filter((s): s is number => s !== null);

  if (scores.length < 2) {
    return (
      <p className="text-xs text-muted-foreground/70 mt-1">Dados insuficientes para sparkline</p>
    );
  }

  const W = 240;
  const H = 60;
  const pad = 8;

  const minS = Math.min(...scores);
  const maxS = Math.max(...scores);
  const range = maxS - minS || 1;

  const toX = (i: number) => pad + (i / (scores.length - 1)) * (W - pad * 2);
  const toY = (s: number) => H - pad - ((s - minS) / range) * (H - pad * 2);

  const points = scores.map((s, i) => `${toX(i)},${toY(s)}`).join(' ');

  return (
    <svg
      role="img"
      aria-label="Histórico de scores"
      viewBox={`0 0 ${W} ${H}`}
      className="w-full max-w-xs h-12"
    >
      <title>Histórico de scores</title>
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
          // biome-ignore lint/suspicious/noArrayIndexKey: sparkline has no stable id
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
  );
}

// ── PSOS section ─────────────────────────────────────────────────────────────

function PsosSection({
  siteId,
  report,
  history,
  hasBasket,
}: {
  siteId: string;
  report: VisibilityReport | null | undefined;
  history: VisibilityReport[] | undefined;
  hasBasket: boolean;
}) {
  const router = useRouter();

  if (!hasBasket) {
    return (
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-sm font-medium text-foreground mb-1">Visibilidade em IA</p>
          <p className="text-xs text-muted-foreground mb-3">
            Configure prompts para medir com que frequência sua marca aparece no Perplexity.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/sites/${siteId}/prompts`)}
            className="text-xs font-medium text-foreground border border-border bg-muted hover:bg-muted rounded px-3 py-1.5 transition-colors"
          >
            Configurar monitoramento →
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-4 px-5">
          <p className="text-sm font-medium text-foreground mb-1">Visibilidade em IA</p>
          <p className="text-xs text-muted-foreground">Aguardando primeira medição semanal...</p>
          <button
            type="button"
            onClick={() => router.push(`/sites/${siteId}/prompts`)}
            className="mt-2 text-xs text-muted-foreground hover:text-muted-foreground transition-colors block"
          >
            Gerenciar prompts →
          </button>
        </CardContent>
      </Card>
    );
  }

  const orderedHistory = [...(history ?? [])].reverse();

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Visibilidade em IA (PSOS)</p>
        <PsosGauge
          psos={report.psos}
          ciLower={report.ciLower}
          ciUpper={report.ciUpper}
          citationCount={report.citationCount}
          totalSamples={report.totalSamples}
        />
        <PsosSparkline reports={orderedHistory} />
        <button
          type="button"
          onClick={() => router.push(`/sites/${siteId}/prompts`)}
          className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
        >
          Gerenciar prompts →
        </button>
      </CardContent>
    </Card>
  );
}

// ── Alert config section ─────────────────────────────────────────────────────

function AlertConfigSection({
  site,
  siteId,
}: {
  site: Site;
  siteId: string;
}) {
  const updateAlerts = useMutation(api.sites.updateAlertConfig);

  async function toggle(field: 'criticalFindings' | 'crawlerBlocked') {
    await updateAlerts({
      siteId: siteId as Id<'sites'>,
      alertConfig: {
        ...site.alertConfig,
        [field]: !site.alertConfig[field],
      },
    });
  }

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-0">
        {/* Row 1 — score drop, always active */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Queda de score</p>
            <p className="text-xs text-muted-foreground">
              Alerta quando cair {site.alertConfig.scoreDropThreshold} pontos ou mais
            </p>
          </div>
          <span className="text-xs font-medium text-[var(--brand-success)] bg-[var(--brand-success-muted)] border border-[var(--brand-success-border)] rounded px-2 py-0.5">
            Ativo
          </span>
        </div>

        <Separator />

        {/* Row 2 — critical findings */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Novos problemas críticos</p>
            <p className="text-xs text-muted-foreground">
              Alerta quando surgir um problema crítico
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle('criticalFindings')}
            className={cn(
              'text-xs font-medium rounded px-2 py-0.5 border transition-colors',
              site.alertConfig.criticalFindings
                ? 'text-[var(--brand-success)] bg-[var(--brand-success-muted)] border-[var(--brand-success-border)] hover:bg-[var(--brand-success-muted)]'
                : 'text-muted-foreground/70 bg-muted border-border hover:bg-muted'
            )}
          >
            {site.alertConfig.criticalFindings ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <Separator />

        {/* Row 3 — crawler blocked */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Crawler de IA bloqueado</p>
            <p className="text-xs text-muted-foreground">
              Alerta quando robots.txt bloquear crawlers de IA
            </p>
          </div>
          <button
            type="button"
            onClick={() => toggle('crawlerBlocked')}
            className={cn(
              'text-xs font-medium rounded px-2 py-0.5 border transition-colors',
              site.alertConfig.crawlerBlocked
                ? 'text-[var(--brand-success)] bg-[var(--brand-success-muted)] border-[var(--brand-success-border)] hover:bg-[var(--brand-success-muted)]'
                : 'text-muted-foreground/70 bg-muted border-border hover:bg-muted'
            )}
          >
            {site.alertConfig.crawlerBlocked ? 'Ativo' : 'Inativo'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SiteDetailPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();

  const site = useQuery(api.sites.getById, { siteId: siteId as Id<'sites'> });
  const audits = useQuery(api.audits.listBySite, {
    siteId: siteId as Id<'sites'>,
    limit: 12,
  });
  const latestReport = useQuery(api.visibilityReports.latestBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const reportHistory = useQuery(api.visibilityReports.listBySite, {
    siteId: siteId as Id<'sites'>,
    limit: 8,
  });
  const baskets = useQuery(api.promptBaskets.listBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const createReport = useMutation(api.shareableReports.create);

  // Loading state
  if (site === undefined || audits === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground/70 text-sm">Carregando…</p>
      </div>
    );
  }

  // Not found
  if (site === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--brand-danger)] text-sm">Site não encontrado.</p>
      </div>
    );
  }

  const latestAudit = audits[0] as Audit | undefined;

  let findings: Finding[] = [];
  if (latestAudit?.outputFiles) {
    try {
      const parsed = JSON.parse(latestAudit.outputFiles) as {
        findings?: Finding[];
      };
      findings = parsed.findings ?? [];
    } catch {
      // malformed JSON — skip findings
    }
  }

  async function handleShare() {
    if (!latestAudit) return;
    try {
      const token = await createReport({
        auditId: latestAudit._id,
        siteId: siteId as Id<'sites'>,
      });
      const url = `${window.location.origin}/report/${token}`;
      await navigator.clipboard.writeText(url);
      alert('Link copiado para a área de transferência!');
    } catch {
      alert('Erro ao gerar link de compartilhamento.');
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          ← Voltar
        </button>

        {/* Header + score badge */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground truncate">{site.name}</h1>
            <p className="text-sm font-mono text-muted-foreground truncate mt-0.5">{site.url}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {SCHEDULE_LABEL[site.schedule]} •{' '}
              {site.monitoringEnabled ? (
                <span className="text-[var(--brand-success)]">Monitoramento ativo</span>
              ) : (
                <span className="text-muted-foreground/70">Monitoramento pausado</span>
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
                className={cn('text-4xl font-bold tabular-nums', scoreColor(latestAudit.score))}
              >
                {latestAudit.score}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide mt-0.5">
                Score AEO
              </span>
            </div>
          )}
        </div>

        {/* Score sparkline */}
        {audits.length > 0 && (
          <Card>
            <CardContent className="py-4 px-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Histórico de scores
              </p>
              <Sparkline audits={audits as Audit[]} />
            </CardContent>
          </Card>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground px-0.5">
              Problemas encontrados
            </p>
            {findings.map((f, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: findings have no stable id
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

        {/* GEO visibility */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-0.5">Visibilidade em IA</p>
          <PsosSection
            siteId={siteId}
            report={latestReport ?? null}
            history={reportHistory}
            hasBasket={(baskets?.length ?? 0) > 0}
          />
        </div>

        {/* Alert config */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-0.5">Configurar alertas</p>
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
            <Button variant="outline" onClick={handleShare} className="flex-1">
              Compartilhar relatório
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
