import Link from 'next/link';

const TICKER_TEXT =
  '§ GPTBot · § ClaudeBot · § PerplexityBot · § Google-Extended · § OAI-SearchBot · § Amazonbot · ';

export function TickerStrip() {
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

type EmptyHeroProps = {
  onAddSite: () => void;
  sitesCount: number;
  avgScore: string;
  planLabel: string;
};

export function EmptyHero({ onAddSite, sitesCount, avgScore, planLabel }: EmptyHeroProps) {
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
                  {sitesCount}
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
              onClick={onAddSite}
              className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:bg-[var(--brand-fg)] hover:text-[var(--brand)] transition-colors cursor-pointer"
            >
              MONITORAR SITE →
            </button>
            <Link
              href="/audit/new"
              className="border border-[var(--brand-danger)] text-[var(--brand-danger)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:bg-[var(--brand-danger)] hover:text-background transition-colors inline-flex items-center"
            >
              AUDITAR SITE →
            </Link>
            <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
              {planLabel}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
