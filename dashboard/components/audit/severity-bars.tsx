interface SeverityBarsProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

const ROWS = [
  { key: 'critical', label: 'Crítico', color: 'var(--brand-danger)' },
  { key: 'high', label: 'Alto', color: 'var(--color-orange-500)' },
  { key: 'medium', label: 'Médio', color: 'var(--brand-blue)' },
  { key: 'low', label: 'Baixo', color: 'var(--muted-foreground)' },
] as const;

export function SeverityBars({ critical, high, medium, low }: SeverityBarsProps) {
  const total = critical + high + medium + low;
  const counts: Record<string, number> = { critical, high, medium, low };

  return (
    <div className="space-y-4">
      {ROWS.map(({ key, label, color }) => {
        const count = counts[key];
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
                {label}
              </span>
              <span
                className="font-[family-name:var(--font-bebas)] text-[22px] leading-none"
                style={{ color }}
              >
                {count}
              </span>
            </div>
            <div className="h-[3px] bg-border w-full">
              <div className="h-[3px]" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
