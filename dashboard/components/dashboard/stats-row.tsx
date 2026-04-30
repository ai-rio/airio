'use client';

type StatsRowProps = {
  sitesCount: number;
  avgScore: string;
  avgPsos: string;
  alertsCount: number;
};

const cells = (props: StatsRowProps) => [
  { label: 'SITES', value: props.sitesCount.toString() },
  { label: 'MÉDIA AEO', value: props.avgScore },
  { label: 'MÉDIA PSOS', value: props.avgPsos },
  { label: 'ALERTAS', value: props.alertsCount.toString() },
];

export function StatsRow(props: StatsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border">
      {cells(props).map((cell) => (
        <div key={cell.label} className="px-8 py-5 border-r border-border last:border-r-0">
          <div className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">
            {cell.label}
          </div>
          <div className="font-[family-name:var(--font-bebas)] text-[40px] leading-none">
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}
