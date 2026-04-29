'use client';

import { PsosChangeBadge } from '@/components/psos-change-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STALE_THRESHOLD_MS } from '@/lib/monitoring-constants';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';

type Site = {
  _id: string;
  name: string;
  url: string;
  schedule: 'weekly' | 'monthly';
  monitoringEnabled: boolean;
  nextAuditAt: number;
};

type Audit = {
  _id: string;
  score: number | null;
  status: string;
  _creationTime: number;
  outputFiles?: string;
};

type AuditWithSite = Audit & { siteId?: string };

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function scoreColorClass(score: number) {
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

const TICKER_TEXT =
  '§ GPTBot · § ClaudeBot · § PerplexityBot · § Google-Extended · § OAI-SearchBot · § Amazonbot · ';

function TickerStrip() {
  const repeated = TICKER_TEXT.repeat(8);
  return (
    <div className="overflow-hidden bg-[var(--brand)] text-[var(--brand-fg)] py-1.5">
      <div
        className="inline-flex whitespace-nowrap font-[family-name:var(--font-mono)] text-[11px] font-bold"
        style={{ animation: 'ticker 60s linear infinite' }}
      >
        <span>{repeated}</span>
        <span aria-hidden>{repeated}</span>
      </div>
    </div>
  );
}

function ScoreBadge({ audits }: { audits: Audit[] | undefined }) {
  if (audits === undefined) {
    return (
      <span className="font-[family-name:var(--font-bebas)] text-[48px] leading-none text-muted-foreground">
        —
      </span>
    );
  }
  const latest = audits[0];
  if (!latest || latest.score === null) {
    return (
      <span className="font-[family-name:var(--font-bebas)] text-[48px] leading-none text-muted-foreground">
        —
      </span>
    );
  }
  const prev = audits[1];
  const delta = prev && prev.score !== null ? latest.score - prev.score : null;
  return (
    <div className="flex flex-col items-end">
      <span
        className={`font-[family-name:var(--font-bebas)] text-[48px] leading-none ${scoreColorClass(latest.score)}`}
      >
        {latest.score}
      </span>
      {delta !== null && delta !== 0 && (
        <span
          className={`font-[family-name:var(--font-mono)] text-[11px] ${delta > 0 ? 'text-[var(--brand-text)]' : 'text-[var(--brand-danger)]'}`}
        >
          {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
        </span>
      )}
    </div>
  );
}

function SparkLine({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const data = scores.map((s, i) => ({ i, s }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data}>
        <Area
          dataKey="s"
          stroke="var(--brand-text)"
          fill="var(--surface-yellow)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip contentStyle={{ display: 'none' }} cursor={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function SitePsosIndicator({ siteId }: { siteId: string }) {
  const latestReport = useQuery(api.visibilityReports.latestBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const reports = useQuery(api.visibilityReports.listBySite, {
    siteId: siteId as Id<'sites'>,
    limit: 2,
  });

  if (latestReport === undefined) {
    return (
      <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
        —
      </span>
    );
  }
  if (latestReport === null) {
    return (
      <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
        Sem dados
      </span>
    );
  }

  const psosColor =
    latestReport.psos >= 0.6
      ? 'text-[var(--brand-success)]'
      : latestReport.psos >= 0.3
        ? 'text-[var(--brand-warning)]'
        : 'text-[var(--brand-danger)]';

  const now = Date.now();
  const isStale =
    latestReport._creationTime !== undefined &&
    now - latestReport._creationTime > STALE_THRESHOLD_MS;
  const dotClass = isStale ? 'bg-[var(--brand-warning)]' : 'bg-[var(--brand-success)]';

  return (
    <div className="flex items-center gap-2">
      <span className={`font-[family-name:var(--font-mono)] text-[11px] ${psosColor}`}>
        PSOS {pct(latestReport.psos)}
      </span>
      <PsosChangeBadge currentPsos={latestReport.psos} previousPsos={reports?.[1]?.psos ?? null} />
      <span className={`w-2 h-2 inline-block ${dotClass}`} />
    </div>
  );
}

function SiteCard({ site }: { site: Site }) {
  const audits = useQuery(api.audits.listBySite, { siteId: site._id });
  const latest = audits?.[0];
  const sparkScores = audits
    ? [...audits]
        .reverse()
        .filter((a) => a.score !== null)
        .map((a) => a.score as number)
    : [];

  let findings: Array<{ severity: string }> = [];
  if (latest?.outputFiles) {
    try {
      findings = JSON.parse(latest.outputFiles).findings ?? [];
    } catch {}
  }
  const critCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;

  return (
    <Link
      href={`/sites/${site._id}`}
      className="bg-card border-r border-border p-8 cursor-pointer hover:bg-muted/50 transition-colors relative flex flex-col gap-6 no-underline"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-bebas)] text-[28px] leading-none text-foreground truncate">
            {site.name}
          </div>
          <div className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1 truncate">
            {site.url}
          </div>
        </div>
        <div className="shrink-0">
          <ScoreBadge audits={audits} />
        </div>
      </div>
      <SparkLine scores={sparkScores} />
      {(critCount > 0 || highCount > 0) && (
        <div className="flex gap-1.5 flex-wrap">
          {critCount > 0 && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 bg-[var(--brand-danger)] text-white">
              {critCount} crítico{critCount > 1 ? 's' : ''}
            </span>
          )}
          {highCount > 0 && (
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 bg-orange-500 text-white">
              {highCount} alto{highCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
      {site.monitoringEnabled && <SitePsosIndicator siteId={site._id} />}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground">
          {latest
            ? `Auditado ${formatDate(latest._creationTime)}`
            : site.nextAuditAt
              ? `Próx. ${formatDate(site.nextAuditAt)}`
              : '—'}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--brand-text)]">
          VER →
        </span>
      </div>
    </Link>
  );
}

function SiteCardSkeleton() {
  return (
    <div className="bg-card border-r border-border p-8 flex flex-col gap-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="h-7 w-40 bg-muted" />
          <div className="h-3 w-56 bg-muted" />
        </div>
        <div className="h-12 w-16 bg-muted shrink-0" />
      </div>
      <div className="h-10 w-full bg-muted" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-muted" />
        <div className="h-5 w-12 bg-muted" />
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="h-3 w-28 bg-muted" />
        <div className="h-3 w-8 bg-muted" />
      </div>
    </div>
  );
}

function EmptyStateDashboard() {
  return (
    <div className="px-8 py-16 border-b border-border">
      <p className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-muted-foreground">
        NENHUM SITE CADASTRADO
      </p>
      <p className="font-sans text-muted-foreground text-[14px] mt-3">
        Adicione um site para começar a auditar a visibilidade em IA.
      </p>
      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-px border border-border">
        <div className="bg-[var(--surface-blue)] p-8 border-r border-border">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em]">
            Auditoria AEO
          </p>
          <p className="font-[family-name:var(--font-bebas)] text-[28px] mt-2 leading-none">
            Descubra como a IA vê seu site
          </p>
          <p className="font-sans text-muted-foreground text-[13px] mt-2">
            Score de visibilidade + correções geradas por IA.
          </p>
        </div>
        <div className="bg-[var(--surface-yellow)] p-8">
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em]">
            Monitoramento
          </p>
          <p className="font-[family-name:var(--font-bebas)] text-[28px] mt-2 leading-none">
            Rastreie sua presença em IA
          </p>
          <p className="font-sans text-muted-foreground text-[13px] mt-2">
            PSOS semanal, alertas automáticos, tendências.
          </p>
        </div>
      </div>
    </div>
  );
}

function AddSiteCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-[var(--surface-blue)] border border-dashed border-[var(--brand-blue)] flex flex-col items-center justify-center min-h-[200px] gap-4 cursor-pointer hover:border-[var(--brand)] hover:bg-card transition-colors w-full"
    >
      <span className="font-[family-name:var(--font-bebas)] text-[48px] leading-none text-muted-foreground">
        +
      </span>
      <span className="font-[family-name:var(--font-mono)] text-[13px] uppercase tracking-widest text-muted-foreground">
        Adicionar Site
      </span>
    </button>
  );
}

function AddSiteModal({ onClose }: { onClose: () => void }) {
  const createSite = useMutation(api.sites.create);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [schedule, setSchedule] = useState<'weekly' | 'monthly'>('weekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createSite({ name, url, schedule });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar site');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-card border border-border w-full max-w-md p-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-foreground mb-6">
          Adicionar Site
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-name"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              Nome
            </label>
            <Input
              id="modal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu site"
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-url"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              URL
            </label>
            <Input
              id="modal-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seusite.com.br"
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-schedule"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              Frequência
            </label>
            <select
              id="modal-schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as 'weekly' | 'monthly')}
              disabled={submitting}
              className="w-full border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          {error && <p className="text-sm text-[var(--brand-danger)]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Criando…' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage({ isDevBypass = false }: { isDevBypass?: boolean }) {
  const { isAuthenticated: convexAuth } = useConvexAuth();
  const isAuthenticated = convexAuth || isDevBypass;

  const [modalOpen, setModalOpen] = useState(false);

  const sites = useQuery(api.sites.listByUser, isAuthenticated ? {} : 'skip');
  const allAudits = useQuery(api.audits.listByUser, isAuthenticated ? {} : 'skip');
  const balance = useQuery(api.users.getMyCreditsBalance, convexAuth ? {} : 'skip');

  if (!isAuthenticated) return <SignIn />;

  const avgScore: string = (() => {
    if (!sites || !allAudits || sites.length === 0) return '—';
    const latestBySite = new Map<string, number>();
    for (const audit of allAudits as AuditWithSite[]) {
      if (!audit.siteId || audit.score === null) continue;
      if (!latestBySite.has(audit.siteId)) {
        latestBySite.set(audit.siteId, audit.score);
      }
    }
    if (latestBySite.size === 0) return '—';
    const sum = [...latestBySite.values()].reduce((a, b) => a + b, 0);
    return Math.round(sum / latestBySite.size).toString();
  })();

  const planLabel =
    balance !== undefined
      ? balance.freeRemaining > 0
        ? 'PLANO FREE'
        : `${balance.remaining} CRÉDITOS`
      : 'PLANO FREE';

  return (
    <>
      <TickerStrip />

      <section className="py-16 px-8 border-b border-border">
        <div className="grid grid-cols-[1fr_auto] gap-8 items-end">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] tracking-[0.15em] uppercase mb-3">
              § Monitoramento AEO / Mercado Brasileiro
            </p>
            <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(56px,8vw,96px)] leading-[0.95] text-foreground mb-8">
              SEUS SITES.
              <br />
              <span className="text-[var(--brand-text)]">SUA PRESENÇA</span>
              <br />
              NO ChatGPT.
            </h1>
            <div className="flex gap-8">
              <div>
                <div className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-[var(--brand-text)]">
                  {sites?.length ?? 0}
                </div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                  Sites monitorados
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-[var(--brand-text)]">
                  {avgScore}
                </div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                  Média AEO
                </div>
              </div>
              <div>
                <div className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-[var(--brand-text)]">
                  0
                </div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground mt-1">
                  Alertas ativos
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity cursor-pointer"
            >
              ＋ ADICIONAR SITE →
            </button>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
              {planLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="px-8 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-foreground">
            SITES MONITORADOS
          </h2>
          {sites !== undefined && (
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
              {sites.length}
            </span>
          )}
        </div>

        {sites === undefined ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px border border-border">
            <SiteCardSkeleton />
            <SiteCardSkeleton />
            <SiteCardSkeleton />
          </div>
        ) : sites.length === 0 ? (
          <EmptyStateDashboard />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px border border-border">
            {(sites as Site[]).map((site) => (
              <SiteCard key={site._id} site={site} />
            ))}
            <AddSiteCard onClick={() => setModalOpen(true)} />
          </div>
        )}
      </section>

      {modalOpen && <AddSiteModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn('resend', { email, redirectTo: '/' });
    setSent(true);
  }

  return (
    <main className="max-w-sm mx-auto py-24 px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">AIRio</h1>
      <p className="text-muted-foreground text-sm mb-8">Entre para auditar seu site</p>
      {sent ? (
        <p className="text-[var(--brand-success)] text-sm">
          Verifique seu email — enviamos um link de acesso.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            required
            className="w-full border border-border bg-background text-foreground px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            className="bg-[var(--brand)] text-[var(--brand-fg)] py-2 font-[family-name:var(--font-bebas)] text-[16px] tracking-wide w-full"
          >
            Entrar com email
          </button>
        </form>
      )}
    </main>
  );
}
