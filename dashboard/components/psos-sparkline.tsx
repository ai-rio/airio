'use client';

interface ReportPoint {
  psos: number;
  ciLower: number;
  ciUpper: number;
  generatedAt: number;
}

export function PsosSparkline({ reports }: { reports: ReportPoint[] }) {
  if (reports.length < 2) {
    return (
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1">
        Dados insuficientes para tendência
      </p>
    );
  }

  const W = 280;
  const H = 72;
  const pad = 10;

  const toX = (i: number) => pad + (i / (reports.length - 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - v * (H - pad * 2);

  const upperBand = reports.map((r, i) => `${toX(i)},${toY(r.ciUpper)}`).join(' ');
  const lowerBand = [...reports]
    .reverse()
    .map((r, i) => `${toX(reports.length - 1 - i)},${toY(r.ciLower)}`)
    .join(' ');
  const linePoints = reports.map((r, i) => `${toX(i)},${toY(r.psos)}`).join(' ');
  const latest = reports[reports.length - 1];
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Gráfico de tendência PSOS"
      >
        <polygon points={`${upperBand} ${lowerBand}`} fill="var(--surface-yellow)" opacity={0.6} />
        <polyline points={linePoints} fill="none" stroke="var(--brand-text)" strokeWidth={2} />
      </svg>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mt-1">
        Últimas {reports.length} semanas · atual {pct(latest.psos)}
      </p>
    </div>
  );
}
