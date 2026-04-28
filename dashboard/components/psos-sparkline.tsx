'use client';

interface ReportPoint {
  psos: number;
  ciLower: number;
  ciUpper: number;
  generatedAt: number;
}

export function PsosSparkline({ reports }: { reports: ReportPoint[] }) {
  if (reports.length < 2) {
    return <p className="text-xs text-gray-400 mt-1">Dados insuficientes para tendência</p>;
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
        <polygon
          points={`${upperBand} ${lowerBand}`}
          fill="currentColor"
          className="text-blue-100"
          opacity={0.8}
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-blue-500"
        />
        <circle
          cx={toX(reports.length - 1)}
          cy={toY(latest.psos)}
          r={3}
          fill="currentColor"
          className="text-blue-600"
        />
      </svg>
      <p className="text-xs text-gray-400 mt-1">
        Últimas {reports.length} semanas · atual {pct(latest.psos)}
      </p>
    </div>
  );
}
