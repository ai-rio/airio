'use client';

import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import { useParams } from 'next/navigation';

interface Finding {
  severity: string;
  title: string;
  description?: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-[var(--brand-danger)] text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-[var(--brand-blue)] text-[var(--brand-blue-fg)]',
  low: 'bg-muted text-muted-foreground border border-border',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Crítico',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function scoreColor(score: number): string {
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-orange-400';
  return 'text-[var(--brand-danger)]';
}

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-[var(--brand)]';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-[var(--brand-danger)]';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(api.shareableReports.getByToken, { token });

  if (data === undefined) {
    return (
      <div className="p-8 text-center font-[family-name:var(--font-mono)] text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="p-8 text-center font-[family-name:var(--font-mono)] text-sm text-[var(--brand-danger)]">
        Relatório não encontrado.
      </div>
    );
  }

  const { siteName, siteUrl, score, findings, createdAt } = data;

  const criticalCount = findings.filter((f: Finding) => f.severity === 'critical').length;
  const highCount = findings.filter((f: Finding) => f.severity === 'high').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Yellow header bar */}
      <header className="bg-[var(--brand)] text-[var(--brand-fg)] px-8 py-3 flex justify-between items-center">
        <span className="font-[family-name:var(--font-bebas)] text-[20px] tracking-wide">
          AIR<span className="opacity-60">IO</span>
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[11px] tracking-[0.1em] opacity-70">
          {createdAt ? formatDate(createdAt) : ''}
        </span>
      </header>

      {/* Hero */}
      <div className="grid grid-cols-[1fr_auto] gap-8 items-center px-8 py-16 border-b border-border">
        {/* Left: site name + score bar */}
        <div>
          <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(40px,6vw,80px)] leading-none text-foreground break-all">
            {siteName}
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1 break-all">
            {siteUrl}
          </p>
          {score !== null && (
            <div className="mt-4 h-2 bg-muted border border-border max-w-sm">
              <div className={`h-full ${scoreBarColor(score)}`} style={{ width: `${score}%` }} />
            </div>
          )}
        </div>

        {/* Right: score display */}
        {score !== null && (
          <div className="text-right">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
              Score AEO
            </p>
            <p
              className={`font-[family-name:var(--font-bebas)] text-[120px] leading-none ${scoreColor(score)}`}
            >
              {score}
            </p>
            {(criticalCount > 0 || highCount > 0) && (
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--brand-danger)] mt-1 tracking-[0.05em]">
                {criticalCount > 0 && `${criticalCount} crítico${criticalCount > 1 ? 's' : ''}`}
                {criticalCount > 0 && highCount > 0 && ' · '}
                {highCount > 0 && `${highCount} alta prioridade`}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Findings section */}
      {findings.length > 0 && (
        <section className="px-8 py-8 border-b border-border">
          <h2 className="font-[family-name:var(--font-bebas)] text-[28px] leading-none mb-5">
            Achados
          </h2>
          <div className="space-y-2">
            {findings.map((f: Finding, i: number) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: findings have no stable id
                key={i}
                className="rounded-sm px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 shrink-0 ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low}`}
                  >
                    {SEVERITY_LABEL[f.severity] ?? f.severity}
                  </span>
                  <div>
                    <p className="font-sans text-sm font-medium leading-snug">{f.title}</p>
                    {f.description && (
                      <p className="font-sans text-sm text-muted-foreground leading-snug mt-0.5">
                        {f.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-8 py-8 text-center font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground tracking-[0.1em]">
        GERADO POR{' '}
        <a href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://seo.ai.rio.br'} className="text-[var(--brand-text)]">
          TAGSMITH
        </a>
      </footer>
    </div>
  );
}
