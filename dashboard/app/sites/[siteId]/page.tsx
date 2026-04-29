'use client';

import { PsosGauge } from '@/components/psos-gauge';
import { PsosSparkline } from '@/components/psos-sparkline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useParams, useRouter } from 'next/navigation';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

const SEVERITY_CHIP: Record<string, string> = {
  critical: 'bg-[var(--brand-danger)] text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-[var(--brand-blue)] text-[var(--brand-blue-fg)]',
  low: 'bg-muted text-muted-foreground border border-border',
};

const SEVERITY_CHIP_LABEL: Record<string, string> = {
  critical: 'CRÍTICO',
  high: 'ALTO',
  medium: 'MÉDIO',
  low: 'BAIXO',
};

const SEVERITY_ROW: Record<string, string> = {
  critical: 'text-[var(--brand-danger)]',
  high: 'text-orange-500',
  medium: 'text-[var(--brand-blue)]',
  low: 'text-muted-foreground',
};

const SCHEDULE_LABEL: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensal',
};

// ── Score history chart ───────────────────────────────────────────────────────

function ScoreChart({ audits }: { audits: Audit[] }) {
  const data = [...audits]
    .reverse()
    .filter((a) => a.score !== null)
    .map((a, i) => ({ i: i + 1, score: a.score as number }));

  if (data.length < 2) {
    return <p className="text-xs text-muted-foreground/70">Dados insuficientes para o gráfico</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--surface-yellow)" stopOpacity={1} />
            <stop offset="95%" stopColor="var(--surface-yellow)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="i" hide />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            border: '1px solid var(--border)',
            background: 'var(--background)',
          }}
          formatter={(v) => [v, 'Score']}
          labelFormatter={() => ''}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--brand-text)"
          strokeWidth={2}
          fill="url(#scoreGrad)"
          dot={{ r: 3, fill: 'var(--brand-text)', stroke: 'var(--background)', strokeWidth: 1.5 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'w-11 h-6 relative border border-border transition-colors shrink-0',
        on ? 'bg-[var(--brand)]' : 'bg-muted'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 bg-background transition-all',
          on ? 'left-5' : 'left-0.5'
        )}
      />
    </button>
  );
}

// ── PSOS section ──────────────────────────────────────────────────────────────

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
      <div className="px-8 py-8 border-b border-border">
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
      </div>
    );
  }

  if (!report) {
    return (
      <div className="px-8 py-8 border-b border-border">
        <p className="text-sm font-medium text-foreground mb-1">Visibilidade em IA</p>
        <p className="text-xs text-muted-foreground">Aguardando primeira medição semanal...</p>
        <button
          type="button"
          onClick={() => router.push(`/sites/${siteId}/prompts`)}
          className="mt-2 text-xs text-muted-foreground hover:text-muted-foreground transition-colors block"
        >
          Gerenciar prompts →
        </button>
      </div>
    );
  }

  const orderedHistory = [...(history ?? [])].reverse();

  return (
    <div className="px-8 py-8 border-b border-border space-y-3">
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
    </div>
  );
}

// ── Alert config section ──────────────────────────────────────────────────────

function AlertConfigSection({ site, siteId }: { site: Site; siteId: string }) {
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
    <div className="px-8 py-8 border-b border-border">
      <p className="font-[family-name:var(--font-bebas)] text-[24px] mb-5">Alertas</p>

      <div className="flex justify-between items-center py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Queda de score</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alerta quando cair {site.alertConfig.scoreDropThreshold} pontos ou mais
          </p>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-text)] px-2.5 py-1">
          Sempre ativo
        </span>
      </div>

      <div className="flex justify-between items-center py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-medium text-foreground">Novos problemas críticos</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alerta quando surgir um problema crítico
          </p>
        </div>
        <Toggle on={site.alertConfig.criticalFindings} onClick={() => toggle('criticalFindings')} />
      </div>

      <div className="flex justify-between items-center py-3.5">
        <div>
          <p className="text-sm font-medium text-foreground">Crawler de IA bloqueado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alerta quando robots.txt bloquear crawlers de IA
          </p>
        </div>
        <Toggle on={site.alertConfig.crawlerBlocked} onClick={() => toggle('crawlerBlocked')} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

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

  if (site === undefined || audits === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground/70 text-sm">Carregando…</p>
      </div>
    );
  }

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
      const parsed = JSON.parse(latestAudit.outputFiles) as { findings?: Finding[] };
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

  // Severity chip counts
  const severityCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const chipOrder = ['critical', 'high', 'medium', 'low'] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="grid grid-cols-[1fr_auto] gap-8 items-start px-8 pt-10 pb-8 border-b border-border">
        <div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-1.5 mb-4 hover:text-foreground transition-colors"
          >
            ← Voltar
          </button>
          <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(40px,6vw,72px)] leading-none text-foreground">
            {site.name}
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground mt-1.5">
            {site.url}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2">
            {SCHEDULE_LABEL[site.schedule]} •{' '}
            {site.monitoringEnabled ? (
              <span className="text-[var(--brand-text)]">Monitoramento ativo</span>
            ) : (
              <span>Monitoramento pausado</span>
            )}
          </p>
        </div>

        {latestAudit?.score != null && (
          <div className="text-right">
            <p
              className={cn(
                'font-[family-name:var(--font-bebas)] text-[96px] leading-none',
                scoreColor(latestAudit.score)
              )}
            >
              {latestAudit.score}
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
              Pontuação AEO
            </p>
          </div>
        )}
      </div>

      {/* ── Severity chips ── */}
      {findings.length > 0 && (
        <div className="px-8 py-4 border-b border-border flex gap-2 flex-wrap">
          {chipOrder.map((sev) => {
            const count = severityCounts[sev];
            if (!count) return null;
            return (
              <span
                key={sev}
                className={cn(
                  'font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1',
                  SEVERITY_CHIP[sev]
                )}
              >
                {count} {SEVERITY_CHIP_LABEL[sev]}
                {count > 1 && sev !== 'medium' ? 'S' : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Score history chart ── */}
      {audits.length > 0 && (
        <div className="px-8 py-8 border-b border-border">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
            Histórico de scores
          </p>
          <ScoreChart audits={audits as Audit[]} />
        </div>
      )}

      {/* ── Findings ── */}
      {findings.length > 0 && (
        <div className="px-8 py-8 border-b border-border">
          <p className="font-[family-name:var(--font-bebas)] text-[24px] mb-5">
            Problemas encontrados
          </p>
          {findings.map((f, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: findings have no stable id
              key={i}
              className="flex gap-4 items-start py-4 border-b border-border last:border-b-0"
            >
              <span
                className={cn(
                  'font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 shrink-0',
                  SEVERITY_CHIP[f.severity] ?? SEVERITY_CHIP.low
                )}
              >
                {SEVERITY_CHIP_LABEL[f.severity] ?? f.severity}
              </span>
              <div>
                <p
                  className={cn(
                    'text-sm font-medium',
                    SEVERITY_ROW[f.severity] ?? 'text-foreground'
                  )}
                >
                  {f.type}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{f.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── GEO visibility ── */}
      <PsosSection
        siteId={siteId}
        report={latestReport ?? null}
        history={reportHistory}
        hasBasket={(baskets?.length ?? 0) > 0}
      />

      {/* ── Alert config ── */}
      <AlertConfigSection site={site as Site} siteId={siteId} />

      {/* ── Actions ── */}
      {latestAudit && (
        <div className="px-8 py-8 border-b border-border flex gap-4 flex-wrap">
          <Button variant="default" onClick={() => router.push(`/audit/${latestAudit._id}`)}>
            Ver auditoria completa →
          </Button>
          <Button variant="outline" onClick={handleShare}>
            Compartilhar relatório
          </Button>
        </div>
      )}
    </div>
  );
}
