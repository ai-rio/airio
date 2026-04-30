'use client';

import { AddSiteModal } from '@/components/add-site-modal';
import { PsosSparkline } from '@/components/psos-sparkline';
import { STALE_THRESHOLD_MS } from '@/lib/monitoring-constants';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Site = {
  _id: Id<'sites'>;
  name: string;
  url: string;
  monitoringEnabled: boolean;
};

type VisibilityReport = {
  psos: number;
  ciLower: number;
  ciUpper: number;
  totalSamples: number;
  generatedAt: number;
};

// ---------------------------------------------------------------------------
// EmptyStateMonitoring
// ---------------------------------------------------------------------------

function EmptyStateMonitoring({ onAddSite }: { onAddSite: () => void }) {
  return (
    <div className="px-8 py-16 border-b border-border">
      <p className="font-[family-name:var(--font-bebas)] text-[32px] text-muted-foreground">
        NENHUM SITE MONITORADO
      </p>
      <p className="font-sans text-muted-foreground text-[14px] mt-2">
        Ative o monitoramento em um site para ver a visibilidade em IA aqui.
      </p>
      <button
        type="button"
        onClick={onAddSite}
        className="mt-6 inline-flex items-center bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:bg-[var(--brand-fg)] hover:text-[var(--brand)] transition-colors cursor-pointer"
      >
        ATIVAR MONITORAMENTO →
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonitoringCard
// ---------------------------------------------------------------------------

function MonitoringCard({ site }: { site: Site }) {
  const latestReport = useQuery(api.visibilityReports.latestBySite, { siteId: site._id });
  const reports = useQuery(api.visibilityReports.listBySite, { siteId: site._id, limit: 8 });

  // Loading state
  if (latestReport === undefined) {
    return (
      <div className="bg-card p-6 hover:bg-muted/50 transition-colors animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-muted" />
          <div className="w-2 h-2 bg-muted" />
        </div>
        <div className="h-12 w-20 bg-muted mb-3" />
        <div className="h-3 w-full bg-muted mb-2" />
        <div className="h-8 w-full bg-muted" />
      </div>
    );
  }

  // Status dot logic
  const isStale =
    latestReport !== null &&
    Date.now() - (latestReport as VisibilityReport).generatedAt > STALE_THRESHOLD_MS;

  let dotClass: string;
  if (site.monitoringEnabled && latestReport !== null && !isStale) {
    dotClass = 'bg-[var(--brand-success)]';
  } else if (isStale) {
    dotClass = 'bg-[var(--brand-warning)]';
  } else {
    dotClass = 'bg-muted';
  }

  // PSOS color
  function psosColor(psos: number): string {
    if (psos >= 0.6) return 'text-[var(--brand-text)]';
    if (psos >= 0.3) return 'text-[var(--brand-warning)]';
    return 'text-[var(--brand-danger)]';
  }

  // Days ago helper
  function daysAgo(ts: number): number {
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  }

  const report = latestReport as VisibilityReport | null;
  const pct = report !== null ? Math.round(report.psos * 100) : null;

  return (
    <div className="bg-card p-6 hover:bg-muted/50 transition-colors">
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-sans text-foreground text-[14px] font-medium truncate mr-2">
          {site.name}
        </span>
        <span className={`w-2 h-2 inline-block flex-shrink-0 ${dotClass}`} />
      </div>

      {/* URL */}
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mb-3 truncate">
        {site.url}
      </p>

      {/* PSOS score */}
      {report === null ? (
        <div className="mb-3">
          <span className="font-[family-name:var(--font-bebas)] text-[48px] leading-none text-muted-foreground">
            —
          </span>
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1">
            Aguardando primeira coleta
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <span
            className={`font-[family-name:var(--font-bebas)] text-[48px] leading-none ${psosColor(report.psos)}`}
          >
            {pct}
          </span>

          {/* CI + sample count */}
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1">
            IC {Math.round(report.ciLower * 100)}–{Math.round(report.ciUpper * 100)} ·{' '}
            {report.totalSamples} amostras
          </p>
        </div>
      )}

      {/* Stale warning */}
      {isStale && report !== null && (
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-warning)] mb-2">
          Última coleta: {daysAgo(report.generatedAt)} dias atrás
        </p>
      )}

      {/* Sparkline */}
      {reports !== undefined && reports.length >= 2 && (
        <div className="mb-3">
          <PsosSparkline reports={reports} />
        </div>
      )}

      {/* Manage link */}
      <div className="mt-2">
        <Link
          href={`/sites/${site._id}/monitoring`}
          className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:opacity-70 transition-opacity"
        >
          GERENCIAR PROMPTS →
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MonitoringPage() {
  const sites = useQuery(api.sites.listByUser);
  const [modalOpen, setModalOpen] = useState(false);

  const monitoredSites =
    sites !== undefined ? sites.filter((s: Site) => s.monitoringEnabled === true) : undefined;

  const count = monitoredSites?.length ?? 0;
  const lastCollectionLabel = '—';
  const alertCount = 0;

  return (
    <div>
      {/* Status strip */}
      <div className="font-[family-name:var(--font-mono)] text-[11px] px-8 py-3 border-b border-border bg-muted/30">
        {count} sites monitorados · Última coleta: {lastCollectionLabel} · {alertCount} alertas
        ativos
      </div>

      {/* Header */}
      <div className="px-8 py-8 border-b border-border">
        <h1 className="font-[family-name:var(--font-bebas)] text-[64px] leading-none">
          VISIBILIDADE EM IA
        </h1>
        <p className="font-sans text-muted-foreground text-[14px] mt-2">
          Acompanhe a presença da sua marca no Perplexity.
        </p>
      </div>

      {/* Content */}
      {monitoredSites === undefined ? (
        /* Loading skeleton */
        <div className="px-8 py-8 border-b border-border">
          <div className="animate-pulse flex gap-4">
            <div className="h-4 w-48 bg-muted" />
            <div className="h-4 w-32 bg-muted" />
          </div>
        </div>
      ) : monitoredSites.length === 0 ? (
        <EmptyStateMonitoring onAddSite={() => setModalOpen(true)} />
      ) : (
        <div className="px-8 py-8 border-b border-border">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px border border-border">
            {monitoredSites.map((site: Site) => (
              <MonitoringCard site={site} key={site._id} />
            ))}
          </div>
        </div>
      )}
      {modalOpen && <AddSiteModal onCloseAction={() => setModalOpen(false)} />}
    </div>
  );
}
