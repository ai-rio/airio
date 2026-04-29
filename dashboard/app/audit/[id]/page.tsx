'use client';

import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import { use } from 'react';

interface BrandSignals {
  wikipedia: string | null;
  reddit: string | null;
  youtube: string | null;
}

interface AeoOutput {
  score: number;
  algorithmicBase: number;
  scoreAdjustment: number;
  findings: Array<{ type: string; severity: string; message: string }>;
  pages: Array<{ url: string; pageType: string }>;
  brandSignals: BrandSignals;
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

const SEVERITY_STYLE: Record<string, string> = {
  critical:
    'bg-[var(--brand-danger-muted)] border-[var(--brand-danger-border)] text-[var(--brand-danger)]',
  high: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
  medium: 'bg-[var(--surface-blue)] border-[var(--brand-blue)]/30 text-[var(--brand-blue)]',
  low: 'bg-muted border-border text-muted-foreground',
};

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

function scoreColorClass(score: number) {
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const audit = useQuery(api.audits.getById, { auditId: id });

  if (!audit) return <p className="p-8 text-sm text-muted-foreground">Carregando…</p>;
  if (audit.status === 'pending')
    return <p className="p-8 text-sm text-muted-foreground">Auditando seu site…</p>;
  if (audit.status === 'failed')
    return <p className="p-8 text-sm text-[var(--brand-danger)]">Falha: {audit.errorMessage}</p>;

  const output: AeoOutput = JSON.parse(audit.outputFiles ?? '{}');
  const score = output.score ?? 0;

  const criticalCount = output.findings?.filter((f) => f.severity === 'critical').length ?? 0;
  const highCount = output.findings?.filter((f) => f.severity === 'high').length ?? 0;

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      {/* Score header */}
      <div className="border-b border-border pb-8 mb-8">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mb-3 uppercase tracking-[0.1em]">
          {audit.url}
        </p>
        <div className="flex items-end gap-6">
          <div>
            <h1 className="font-[family-name:var(--font-bebas)] text-[80px] leading-none">
              <span className={scoreColorClass(score)}>{score}</span>
              <span className="text-muted-foreground text-[40px]">/100</span>
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.15em] mt-1">
              Pontuação AEO
            </p>
          </div>
        </div>
        {output.algorithmicBase != null && (
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-3">
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
                {output.scoreAdjustment} ajuste de conteúdo (IA)
              </span>
            )}
          </p>
        )}
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex gap-1.5 mt-3">
            {criticalCount > 0 && (
              <span
                className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 ${SEVERITY_CHIP.critical}`}
              >
                {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {highCount > 0 && (
              <span
                className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 ${SEVERITY_CHIP.high}`}
              >
                {highCount} alto{highCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Brand signals */}
      {output.brandSignals && (
        <section className="border-b border-border pb-8 mb-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">
            Presença de Marca
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['wikipedia', 'reddit', 'youtube'] as const).map((platform) => {
              const url = output.brandSignals[platform];
              return url ? (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--brand-success-border)] bg-[var(--brand-success-muted)] text-[var(--brand-success)] text-sm hover:opacity-80 transition-opacity"
                >
                  <span>✓</span>
                  <span className="capitalize font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em]">
                    {platform}
                  </span>
                </a>
              ) : (
                <div
                  key={platform}
                  className="flex items-center gap-2 px-3 py-2 border border-border bg-muted text-muted-foreground text-sm"
                >
                  <span>✗</span>
                  <span className="capitalize font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em]">
                    {platform}
                  </span>
                </div>
              );
            })}
            <div
              className={`flex items-center gap-2 px-3 py-2 border text-sm ${
                output.rslPresent
                  ? 'border-[var(--brand-success-border)] bg-[var(--brand-success-muted)] text-[var(--brand-success)]'
                  : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              <span>{output.rslPresent ? '✓' : '✗'}</span>
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em]">
                RSL 1.0
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Findings */}
      <section className="border-b border-border pb-8 mb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">
          Problemas Encontrados
        </h2>
        <ul className="space-y-2">
          {output.findings?.map((f) => (
            <li
              key={`${f.severity}-${f.message}`}
              className={`text-sm p-3 border ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low}`}
            >
              <span
                className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-1.5 py-0.5 mr-2 ${SEVERITY_CHIP[f.severity] ?? SEVERITY_CHIP.low}`}
              >
                {f.severity}
              </span>
              {f.message}
            </li>
          ))}
        </ul>
      </section>

      {/* CMS Instructions */}
      {output.cmsInstructions?.length > 0 && (
        <section className="border-b border-border pb-8 mb-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">
            Passos de Implementação
          </h2>
          <ol className="space-y-3">
            {output.cmsInstructions.map((ins, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: no stable id
              <li key={i} className="border border-border overflow-hidden text-sm">
                <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
                  <span className="font-medium">
                    {i + 1}. {ins.step}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.05em] text-muted-foreground">
                    {TOOL_LABEL[ins.tool] ?? ins.tool}
                  </span>
                </div>
                {ins.code && (
                  <pre className="p-3 text-xs bg-[#0d1117] text-[var(--brand-text)] overflow-x-auto whitespace-pre-wrap">
                    {ins.code.replace(/\\n/g, '\n').replace(/\\"/g, '"')}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Downloads */}
      <section className="border-b border-border pb-8 mb-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">Arquivos Gerados</h2>
        <div className="grid grid-cols-2 gap-px border border-border">
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

      {/* Rewritten passages */}
      {output.rewrittenPassages?.length > 0 && (
        <section className="border-b border-border pb-8 mb-8">
          <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">
            Trechos Otimizados para IA
          </h2>
          <div className="space-y-px border border-border">
            {output.rewrittenPassages.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: no stable id
              <div key={i} className="overflow-hidden text-sm">
                <div className="bg-[var(--brand-danger-muted)] p-3 border-b border-border">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-danger)] mb-1">
                    Original
                  </p>
                  <p className="text-foreground">{p.original}</p>
                </div>
                <div className="bg-[var(--brand-success-muted)] p-3">
                  <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--brand-success)] mb-1">
                    Otimizado para IA
                  </p>
                  <p className="text-foreground">{p.optimized}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pages crawled */}
      {output.pages?.length > 0 && (
        <section>
          <h2 className="font-[family-name:var(--font-bebas)] text-[24px] mb-4">
            Páginas Analisadas
          </h2>
          <ul>
            {output.pages.map((p) => (
              <li
                key={p.url}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <span className="text-muted-foreground font-[family-name:var(--font-mono)] text-[11px] truncate mr-4">
                  {new URL(p.url).pathname || '/'}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.05em] shrink-0 bg-muted text-muted-foreground border border-border px-2 py-0.5">
                  {PAGE_TYPE_LABEL[p.pageType] ?? p.pageType}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function DownloadCard({
  title,
  description,
  onClick,
}: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-4 text-left hover:bg-muted transition-colors w-full"
    >
      <p className="font-[family-name:var(--font-bebas)] text-[18px] leading-none text-foreground">
        {title}
      </p>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1">
        {description}
      </p>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] mt-2">
        ↓ BAIXAR
      </p>
    </button>
  );
}
