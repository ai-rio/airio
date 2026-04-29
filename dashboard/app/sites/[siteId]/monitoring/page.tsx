'use client';

import { PsosChangeBadge } from '@/components/psos-change-badge';
import { PsosGauge } from '@/components/psos-gauge';
import { PsosSparkline } from '@/components/psos-sparkline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STALE_THRESHOLD_MS } from '@/lib/monitoring-constants';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MonitoringPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const site = useQuery(api.sites.getById, { siteId });
  const latestReport = useQuery(api.visibilityReports.latestBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const reports = useQuery(api.visibilityReports.listBySite, {
    siteId: siteId as Id<'sites'>,
    limit: 8,
  });
  const baskets = useQuery(api.promptBaskets.listBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const recentAudits = useQuery(api.audits.listBySite, { siteId });

  const setMonitoringEnabled = useMutation(api.sites.setMonitoringEnabled);
  const updateAlertConfig = useMutation(api.sites.updateAlertConfig);

  const [monitoringEnabled, setMonitoringEnabled_local] = useState<boolean | undefined>(undefined);
  const [psosDropThreshold, setPsosDropThreshold] = useState<string>('0.10');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAllPrompts, setShowAllPrompts] = useState(false);

  useEffect(() => {
    if (site) {
      setMonitoringEnabled_local(site.monitoringEnabled);
      if (site.alertConfig?.psosDropThreshold !== undefined) {
        setPsosDropThreshold(String(site.alertConfig.psosDropThreshold));
      }
    }
  }, [site]);

  async function handleToggle() {
    if (monitoringEnabled === undefined) return;
    const next = !monitoringEnabled;
    setMonitoringEnabled_local(next);
    try {
      await setMonitoringEnabled({ siteId, enabled: next });
    } catch {
      setMonitoringEnabled_local(!next);
      setSaveError('Erro ao salvar. Tente novamente.');
    }
  }

  async function handleSaveAlertConfig() {
    if (!site) return;
    const val = Number.parseFloat(psosDropThreshold);
    if (Number.isNaN(val) || val < 0 || val > 1) {
      setSaveError('Valor deve ser entre 0 e 1');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await updateAlertConfig({
        siteId,
        alertConfig: {
          scoreDropThreshold: site.alertConfig?.scoreDropThreshold ?? 10,
          criticalFindings: site.alertConfig?.criticalFindings ?? true,
          crawlerBlocked: site.alertConfig?.crawlerBlocked ?? true,
          psosDropThreshold: val,
        },
      });
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // Diagnostic CTA trigger
  const previousReport = reports?.[1];
  const threshold = site?.alertConfig?.psosDropThreshold ?? 0.1;
  const psosDropped =
    latestReport && previousReport && previousReport.psos - latestReport.psos > threshold;
  const hasRecentAudit = recentAudits?.some(
    (a: { status: string; _creationTime: number }) =>
      a.status === 'completed' && a._creationTime > (previousReport?.generatedAt ?? 0)
  );
  const showDiagnostic = psosDropped && !hasRecentAudit;

  // Stale warning
  const daysAgo = latestReport
    ? Math.floor((Date.now() - latestReport.generatedAt) / (24 * 60 * 60 * 1000))
    : 0;
  const isStale = latestReport && Date.now() - latestReport.generatedAt > STALE_THRESHOLD_MS;

  // Basket
  const basket = baskets?.[0] ?? null;
  const visiblePrompts = showAllPrompts
    ? (basket?.prompts ?? [])
    : (basket?.prompts.slice(0, 3) ?? []);
  const hiddenCount = (basket?.prompts.length ?? 0) - 3;

  return (
    <div>
      {/* Section 1 — Header */}
      <section className="px-8 py-8 border-b border-border">
        <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <Link
              href="/"
              className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] hover:text-[var(--brand-text)] transition-colors"
            >
              ← Dashboard
            </Link>
            <h1 className="font-[family-name:var(--font-bebas)] text-[64px] leading-none mt-2">
              {site?.name ?? '...'}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mt-1">
              Monitoramento semanal · motor: Perplexity
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase">
              {monitoringEnabled ? 'MONITORAMENTO ATIVO' : 'MONITORAMENTO INATIVO'}
            </span>
            <button
              type="button"
              onClick={handleToggle}
              role="switch"
              aria-checked={monitoringEnabled ?? false}
              aria-label="Ativar/desativar monitoramento"
              className={`w-11 h-6 relative border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)] ${
                monitoringEnabled
                  ? 'bg-[var(--brand)] border-[var(--brand)]'
                  : 'bg-muted border-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-background transition-all ${
                  monitoringEnabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Section 2 — PSOS */}
      <section className="px-8 py-8 border-b border-border">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
          VISIBILIDADE EM IA
        </p>

        {latestReport === undefined ? (
          <div className="animate-pulse bg-muted h-24 w-48" />
        ) : latestReport === null ? (
          <>
            <div className="font-[family-name:var(--font-bebas)] text-[96px] leading-none text-muted-foreground">
              —
            </div>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
              Aguardando primeira coleta
            </p>
          </>
        ) : (
          <>
            <div className="flex items-end gap-4">
              <PsosGauge
                psos={latestReport.psos}
                ciLower={latestReport.ciLower}
                ciUpper={latestReport.ciUpper}
                citationCount={latestReport.citationCount}
                totalSamples={latestReport.totalSamples}
                size="hero"
              />
              <PsosChangeBadge
                currentPsos={latestReport.psos}
                previousPsos={reports?.[1]?.psos ?? null}
              />
            </div>
            <div className="mt-4">
              <PsosSparkline reports={reports ?? []} />
            </div>
            {isStale && (
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-warning)] mt-2">
                Última coleta: {daysAgo} dias atrás
              </p>
            )}
          </>
        )}
      </section>

      {/* Section 3 — Prompt baskets */}
      <section className="px-8 py-8 border-b border-border">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
          CONFIGURAÇÃO DE PROMPTS
        </p>

        {baskets === undefined ? (
          <div className="animate-pulse bg-muted h-16 w-64" />
        ) : !basket ? (
          <>
            <p className="font-sans text-muted-foreground text-[14px]">
              Nenhum prompt configurado.
            </p>
            <Link href={`/sites/${siteId}/prompts`}>
              <Button variant="outline" className="mt-4">
                Configurar prompts →
              </Button>
            </Link>
          </>
        ) : (
          <>
            <p className="font-sans text-foreground text-[14px] font-medium">{basket.brandName}</p>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase">
              {basket.engine}
            </span>
            <ul className="mt-3 space-y-1">
              {visiblePrompts.map((prompt: string) => (
                <li
                  key={prompt}
                  className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground"
                >
                  {prompt}
                </li>
              ))}
            </ul>
            {!showAllPrompts && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllPrompts(true)}
                className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-2 hover:text-[var(--brand-text)] transition-colors"
              >
                + {hiddenCount} mais
              </button>
            )}
            <div className="mt-4">
              <Link
                href={`/sites/${siteId}/prompts`}
                className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] hover:opacity-80 transition-opacity"
              >
                GERENCIAR PROMPTS →
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Section 4 — Alert config (last, no border-b) */}
      <section className="px-8 py-8">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-4">
          CONFIGURAÇÃO DE ALERTAS
        </p>

        <label
          htmlFor="psos-drop-threshold"
          className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em]"
        >
          Queda de PSOS para alerta (0–1)
        </label>
        <div className="flex items-center gap-3 mt-2">
          <Input
            id="psos-drop-threshold"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={psosDropThreshold}
            onChange={(e) => setPsosDropThreshold(e.target.value)}
            className="w-24 border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <Button
            onClick={handleSaveAlertConfig}
            disabled={saving}
            className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity"
          >
            {saving ? 'SALVANDO...' : 'SALVAR'}
          </Button>
        </div>
        {saveError && (
          <p
            className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-danger)] mt-2"
            role="alert"
          >
            {saveError}
          </p>
        )}

        {showDiagnostic && (
          <div className="mt-6 border-l-4 border-[var(--brand-danger)] pl-4 bg-[var(--brand-danger-muted)] py-3 pr-4">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-danger)] uppercase tracking-[0.1em]">
              QUEDA DE VISIBILIDADE DETECTADA
            </p>
            <p className="font-sans text-foreground text-[14px] mt-1">
              PSOS caiu mais que o limite configurado desde a última coleta.
            </p>
            <Link href={`/audit/new?siteId=${siteId}`} className="mt-3 inline-block">
              <Button className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity">
                RODAR AUDITORIA AGORA →
              </Button>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
