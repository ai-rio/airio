'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import { useParams } from 'next/navigation';

interface Finding {
  severity: string;
  title: string;
  description?: string;
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
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

function scoreColor(score: number): string {
  if (score >= 70) return 'text-[var(--brand-success)]';
  if (score >= 40) return 'text-[var(--brand-warning)]';
  return 'text-[var(--brand-danger)]';
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const data = useQuery(api.shareableReports.getByToken, { token });

  if (data === undefined) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (data === null) {
    return <div className="p-8 text-center text-sm text-red-500">Relatório não encontrado.</div>;
  }

  const { siteName, siteUrl, score, findings } = data;

  const criticalCount = findings.filter((f: Finding) => f.severity === 'critical').length;
  const highCount = findings.filter((f: Finding) => f.severity === 'high').length;

  return (
    <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Relatório AEO
        </p>
        <h1 className="text-2xl font-bold leading-tight">{siteName}</h1>
        <p className="text-sm text-muted-foreground break-all">{siteUrl}</p>
      </div>

      <Separator />

      {/* Score */}
      {score !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score AEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className={`text-6xl font-bold tabular-nums ${scoreColor(score)}`}>
              {score}
              <span className="text-2xl text-muted-foreground">/100</span>
            </p>
            {(criticalCount > 0 || highCount > 0) && (
              <p className="text-xs text-[var(--brand-danger)]">
                {criticalCount > 0 && `${criticalCount} crítico${criticalCount > 1 ? 's' : ''}`}
                {criticalCount > 0 && highCount > 0 && ' · '}
                {highCount > 0 && `${highCount} alta prioridade`}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Achados</h2>
          <div className="space-y-2">
            {findings.map((f: Finding, i: number) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: findings have no stable id
                key={i}
                className={`rounded-lg border px-4 py-3 text-sm ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold">
                    {SEVERITY_LABEL[f.severity] ?? f.severity}
                  </span>
                  <span className="font-medium">{f.title}</span>
                </div>
                {f.description && (
                  <p className="text-sm leading-snug opacity-90">{f.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <Separator />

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground space-y-1 pb-4">
        <p>
          Gerado por{' '}
          <a
            href="https://ai.rio.br"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2 hover:text-foreground transition-colors"
          >
            airio
          </a>
        </p>
        <p className="opacity-60">Otimização para IA · ai.rio.br</p>
      </footer>
    </main>
  );
}
