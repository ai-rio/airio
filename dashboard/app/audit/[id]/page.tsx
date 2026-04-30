'use client';

import { AuditSidebar } from '@/components/audit/audit-sidebar';
import { BrandSignals } from '@/components/audit/brand-signals';
import { CodeBlock } from '@/components/audit/code-block';
import { DownloadCard } from '@/components/audit/download-card';
import { FindingRow } from '@/components/audit/finding-row';
import { ScoreDonut } from '@/components/audit/score-donut';
import { SeverityBars } from '@/components/audit/severity-bars';
import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { use } from 'react';

interface AeoOutput {
  score: number;
  algorithmicBase: number;
  scoreAdjustment: number;
  findings: Array<{ type: string; severity: string; message: string }>;
  pages: Array<{ url: string; pageType: string }>;
  brandSignals: { wikipedia: string | null; reddit: string | null; youtube: string | null };
  rslPresent: boolean;
  llmsTxt: string;
  robotsPatch: string;
  schemaBlocks: Array<{ page: string; json: string }>;
  rewrittenPassages: Array<{ page: string; original: string; optimized: string }>;
  cmsInstructions: Array<{ step: string; code: string; tool: string }>;
}

function downloadFile(content: string, filename: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url;
  }
}

function scoreColorClass(score: number): string {
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
};

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
};

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const audit = useQuery(api.audits.getById, { auditId: id });

  if (!audit)
    return (
      <p className="px-8 py-16 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
        Carregando…
      </p>
    );
  if (audit.status === 'pending')
    return (
      <p className="px-8 py-16 font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] animate-pulse">
        Auditando seu site…
      </p>
    );
  if (audit.status === 'failed')
    return (
      <p className="px-8 py-16 font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-danger)] uppercase tracking-[0.1em]">
        Falha: {audit.errorMessage}
      </p>
    );

  const output: AeoOutput = JSON.parse(audit.outputFiles ?? '{}');
  const score = output.score ?? 0;
  const findings = output.findings ?? [];
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;
  const brandCount =
    ['wikipedia', 'reddit', 'youtube'].filter(
      (p) => output.brandSignals?.[p as keyof typeof output.brandSignals]
    ).length + (output.rslPresent ? 1 : 0);

  const sidebarSections = [
    { id: 'findings', label: 'Problemas', count: findings.length },
    ...(output.cmsInstructions?.length > 0
      ? [{ id: 'implementation', label: 'Implementação', count: output.cmsInstructions.length }]
      : []),
    { id: 'downloads', label: 'Downloads' },
    ...(output.rewrittenPassages?.length > 0
      ? [{ id: 'passages', label: 'Trechos IA', count: output.rewrittenPassages.length }]
      : []),
    ...(output.pages?.length > 0
      ? [{ id: 'pages', label: 'Páginas', count: output.pages.length }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="px-8 py-16 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <Link
                href="/"
                className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] hover:text-[var(--brand-text)] transition-colors shrink-0"
              >
                ← Dashboard
              </Link>
              <span className="text-border">·</span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground truncate">
                {audit.url}
              </span>
            </div>

            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-3">
              § Pontuação AEO
            </p>
            <h1
              className={`font-[family-name:var(--font-bebas)] leading-none mb-4 ${scoreColorClass(score)}`}
              style={{ fontSize: 'clamp(80px,10vw,140px)' }}
            >
              {score}
              <span className="text-muted-foreground" style={{ fontSize: 'clamp(40px,5vw,70px)' }}>
                /100
              </span>
            </h1>

            {output.algorithmicBase != null && (
              <p className="font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground mb-4">
                Base algorítmica {output.algorithmicBase}
                {output.scoreAdjustment != null && output.scoreAdjustment !== 0 && (
                  <span
                    className={
                      output.scoreAdjustment > 0
                        ? 'text-[var(--brand-text)]'
                        : 'text-[var(--brand-danger)]'
                    }
                  >
                    {' '}
                    {output.scoreAdjustment > 0 ? '+' : ''}
                    {output.scoreAdjustment} ajuste IA
                  </span>
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {criticalCount > 0 && (
                <span
                  className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 ${SEVERITY_CHIP.critical}`}
                >
                  {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
              {highCount > 0 && (
                <span
                  className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 ${SEVERITY_CHIP.high}`}
                >
                  {highCount} alto{highCount > 1 ? 's' : ''}
                </span>
              )}
              {mediumCount > 0 && (
                <span
                  className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 ${SEVERITY_CHIP.medium}`}
                >
                  {mediumCount} médio{mediumCount > 1 ? 's' : ''}
                </span>
              )}
              {lowCount > 0 && (
                <span
                  className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 ${SEVERITY_CHIP.low}`}
                >
                  {lowCount} baixo{lowCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <ScoreDonut score={score} />
        </div>
      </section>

      {/* ── BENTO METRICS ── */}
      <section className="border-b border-border">
        <div className="grid grid-cols-3 gap-px" style={{ backgroundColor: 'var(--border)' }}>
          {/* Findings distribution */}
          <div className="bg-card px-8 py-8">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-6">
              § Distribuição
            </p>
            <SeverityBars
              critical={criticalCount}
              high={highCount}
              medium={mediumCount}
              low={lowCount}
            />
          </div>

          {/* Brand signals */}
          <div className="bg-card px-8 py-8">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-6">
              § Presença de Marca
            </p>
            <BrandSignals
              wikipedia={output.brandSignals?.wikipedia ?? null}
              reddit={output.brandSignals?.reddit ?? null}
              youtube={output.brandSignals?.youtube ?? null}
              rslPresent={output.rslPresent ?? false}
            />
          </div>

          {/* Scope stats */}
          <div className="bg-card px-8 py-8">
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-6">
              § Escopo
            </p>
            <div className="space-y-6">
              {[
                { value: output.pages?.length ?? 0, label: 'Páginas analisadas' },
                { value: findings.length, label: 'Problemas encontrados' },
                {
                  value: brandCount,
                  suffix: '/4',
                  label: 'Sinais de marca',
                  colored: true,
                },
              ].map(({ value, suffix, label, colored }) => (
                <div key={label}>
                  <div
                    className={`font-[family-name:var(--font-bebas)] text-[48px] leading-none ${colored ? scoreColorClass(score) : 'text-foreground'}`}
                  >
                    {value}
                    {suffix && <span className="text-muted-foreground text-[24px]">{suffix}</span>}
                  </div>
                  <div className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SIDEBAR + CONTENT ── */}
      <div className="grid grid-cols-[240px_1fr]">
        <AuditSidebar
          sections={sidebarSections}
          onDownloadLlms={() => downloadFile(output.llmsTxt, 'llms.txt')}
          onDownloadRobots={() => downloadFile(output.robotsPatch, 'robots-patch.txt')}
        />

        <main>
          {/* FINDINGS */}
          {findings.length > 0 && (
            <section id="findings" className="px-8 py-8 border-b border-border scroll-mt-14">
              <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none mb-6">
                Problemas Encontrados
                <span className="font-[family-name:var(--font-mono)] text-[16px] text-muted-foreground ml-3">
                  {findings.length}
                </span>
              </h2>
              <ul className="space-y-2">
                {findings.map((f, i) => (
                  <FindingRow
                    key={`${f.severity}-${i}`}
                    severity={f.severity}
                    message={f.message}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* IMPLEMENTATION */}
          {output.cmsInstructions?.length > 0 && (
            <section id="implementation" className="px-8 py-8 border-b border-border scroll-mt-14">
              <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none mb-6">
                Passos de Implementação
                <span className="font-[family-name:var(--font-mono)] text-[16px] text-muted-foreground ml-3">
                  {output.cmsInstructions.length}
                </span>
              </h2>
              <ol className="space-y-4">
                {output.cmsInstructions.map((ins, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: no stable id
                  <li key={i} className="border border-border overflow-hidden">
                    <div className="flex items-start justify-between px-4 py-3 bg-muted border-b border-border gap-4">
                      <div className="flex items-center gap-3">
                        <span className="font-[family-name:var(--font-bebas)] text-[20px] text-muted-foreground leading-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm font-medium">{ins.step}</span>
                      </div>
                      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.05em] text-muted-foreground shrink-0">
                        {TOOL_LABEL[ins.tool] ?? ins.tool}
                      </span>
                    </div>
                    {ins.code && (
                      <CodeBlock code={ins.code.replace(/\\n/g, '\n').replace(/\\"/g, '"')} />
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* DOWNLOADS */}
          <section id="downloads" className="px-8 py-8 border-b border-border scroll-mt-14">
            <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none mb-6">
              Arquivos Gerados
            </h2>
            <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: 'var(--border)' }}>
              <DownloadCard
                title="llms.txt"
                description="Para ChatGPT, Claude, Perplexity"
                tag="Prioritário"
                tagPrimary
                onClick={() => downloadFile(output.llmsTxt, 'llms.txt')}
              />
              <DownloadCard
                title="robots.txt (patch)"
                description="Desbloqueia crawlers de IA"
                tag="Recomendado"
                onClick={() => downloadFile(output.robotsPatch, 'robots-patch.txt')}
              />
              {output.schemaBlocks?.length > 0 && (
                <DownloadCard
                  title="Schema JSON-LD"
                  description={`${output.schemaBlocks.length} bloco(s) gerado(s)`}
                  tag="Schema.org"
                  onClick={() =>
                    downloadFile(
                      output.schemaBlocks.map((s) => s.json).join('\n\n'),
                      'schema.jsonld',
                      'application/ld+json'
                    )
                  }
                />
              )}
            </div>
          </section>

          {/* REWRITTEN PASSAGES */}
          {output.rewrittenPassages?.length > 0 && (
            <section id="passages" className="px-8 py-8 border-b border-border scroll-mt-14">
              <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none mb-6">
                Trechos Otimizados para IA
                <span className="font-[family-name:var(--font-mono)] text-[16px] text-muted-foreground ml-3">
                  {output.rewrittenPassages.length}
                </span>
              </h2>
              <div className="space-y-4">
                {output.rewrittenPassages.map((p, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: no stable id
                  <div key={i} className="border border-border overflow-hidden">
                    <div className="px-4 py-2 border-b border-border bg-muted">
                      <span className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.1em]">
                        {p.page ? safePathname(p.page) : `Trecho ${i + 1}`}
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-px"
                      style={{ backgroundColor: 'var(--border)' }}
                    >
                      <div className="bg-[var(--brand-danger-muted)] p-4">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-danger)] mb-2">
                          Original
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{p.original}</p>
                      </div>
                      <div className="bg-[var(--brand-success-muted)] p-4">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-success)] mb-2">
                          Otimizado para IA
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{p.optimized}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PAGES */}
          {output.pages?.length > 0 && (
            <section id="pages" className="px-8 py-8 scroll-mt-14">
              <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none mb-6">
                Páginas Analisadas
                <span className="font-[family-name:var(--font-mono)] text-[16px] text-muted-foreground ml-3">
                  {output.pages.length}
                </span>
              </h2>
              <div className="border border-border">
                {output.pages.map((p, i) => (
                  <div
                    key={p.url}
                    className={`flex items-center justify-between px-4 py-3 ${i < output.pages.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <span className="font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground truncate mr-4">
                      {safePathname(p.url)}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.05em] shrink-0 bg-muted text-muted-foreground border border-border px-2 py-1">
                      {PAGE_TYPE_LABEL[p.pageType] ?? p.pageType}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
