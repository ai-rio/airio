'use client';

interface PsosGaugeProps {
  psos: number;
  ciLower: number;
  ciUpper: number;
  citationCount: number;
  totalSamples: number;
}

export function PsosGauge({ psos, ciLower, ciUpper, citationCount, totalSamples }: PsosGaugeProps) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const color = psos >= 0.6 ? 'text-green-600' : psos >= 0.3 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="flex flex-col gap-1">
      <div className={`text-3xl font-bold tabular-nums ${color}`}>{pct(psos)}</div>
      <div className="text-xs text-gray-500">
        IC 95%: {pct(ciLower)} – {pct(ciUpper)}
      </div>
      <div className="text-xs text-gray-400">
        {citationCount}/{totalSamples} amostras detectadas
      </div>
    </div>
  );
}
