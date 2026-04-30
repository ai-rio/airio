'use client';

import { Cell, Pie, PieChart, Tooltip } from 'recharts';

interface ScoreDonutProps {
  score: number;
}

function scoreColorVar(score: number): string {
  if (score >= 70) return 'var(--brand-text)';
  if (score >= 40) return 'var(--brand-blue)';
  return 'var(--brand-danger)';
}

function scoreColorClass(score: number): string {
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

export function ScoreDonut({ score }: ScoreDonutProps) {
  const color = scoreColorVar(score);
  const data = [
    { name: 'score', value: score },
    { name: 'remaining', value: 100 - score },
  ];

  return (
    <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          innerRadius={70}
          outerRadius={90}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
          isAnimationActive={false}
        >
          <Cell fill={color} />
          <Cell fill="var(--border)" />
        </Pie>
        <Tooltip contentStyle={{ display: 'none' }} cursor={false} />
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className={`font-[family-name:var(--font-bebas)] text-[68px] leading-none ${scoreColorClass(score)}`}
        >
          {score}
        </span>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
          / 100
        </span>
      </div>
    </div>
  );
}
