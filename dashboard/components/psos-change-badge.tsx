'use client';

interface PsosChangeBadgeProps {
  currentPsos: number;
  previousPsos: number | null;
}

export function PsosChangeBadge({ currentPsos, previousPsos }: PsosChangeBadgeProps) {
  if (previousPsos === null) return null;

  const delta = currentPsos - previousPsos;
  if (Math.abs(delta) < 0.01) return null;

  const pp = Math.round(Math.abs(delta) * 100);
  const isUp = delta > 0;

  const colorClass = isUp
    ? 'bg-[var(--brand-success-muted)] text-[var(--brand-success)] border border-[var(--brand-success-border)]'
    : 'bg-[var(--brand-danger-muted)] text-[var(--brand-danger)] border border-[var(--brand-danger-border)]';

  const label = isUp ? `↑ +${pp}PP` : `↓ -${pp}PP`;

  return (
    <span
      className={`font-[family-name:var(--font-mono)] text-[10px] px-1.5 py-0.5 uppercase tracking-[0.05em] ${colorClass}`}
    >
      {label}
    </span>
  );
}
