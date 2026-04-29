'use client';

interface PsosGaugeProps {
  psos: number;
  ciLower: number;
  ciUpper: number;
  citationCount: number;
  totalSamples: number;
  size?: 'hero' | 'card';
}

export function PsosGauge({
  psos,
  ciLower,
  ciUpper,
  citationCount,
  totalSamples,
  size = 'card',
}: PsosGaugeProps) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const color =
    psos >= 0.6
      ? 'text-[var(--brand-success)]'
      : psos >= 0.3
        ? 'text-[var(--brand-warning)]'
        : 'text-[var(--brand-danger)]';
  const sizeClass = size === 'hero' ? 'text-[96px]' : 'text-[48px]';

  return (
    <div className="flex flex-col gap-1" aria-label={`PSOS: ${pct(psos)}`}>
      <div
        className={`font-[family-name:var(--font-bebas)] leading-none tabular-nums ${sizeClass} ${color}`}
      >
        {pct(psos)}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
        IC 95%: {pct(ciLower)} – {pct(ciUpper)}
      </div>
      <div className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground">
        {citationCount}/{totalSamples} amostras detectadas
      </div>
      {totalSamples < 10 && (
        <div className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-warning)]">
          Dados insuficientes para conclusões confiáveis
        </div>
      )}
    </div>
  );
}
