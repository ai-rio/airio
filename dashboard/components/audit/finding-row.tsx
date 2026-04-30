const SEVERITY_STYLE: Record<string, string> = {
  critical:
    'bg-[var(--brand-danger-muted)] border-[var(--brand-danger-border)] text-[var(--brand-danger)]',
  high: 'bg-[var(--brand-warning-muted)] border-[var(--brand-warning-border)] text-[var(--brand-warning)]',
  medium: 'bg-[var(--surface-blue)] border-[var(--brand-blue)]/30 text-[var(--brand-blue)]',
  low: 'bg-muted border-border text-muted-foreground',
};

const SEVERITY_CHIP: Record<string, string> = {
  critical: 'bg-[var(--brand-danger)] text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-[var(--brand-blue)] text-[var(--brand-blue-fg)]',
  low: 'bg-muted text-muted-foreground border border-border',
};

interface FindingRowProps {
  severity: string;
  message: string;
}

export function FindingRow({ severity, message }: FindingRowProps) {
  return (
    <li className={`flex gap-3 p-4 border ${SEVERITY_STYLE[severity] ?? SEVERITY_STYLE.low}`}>
      <span
        className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-1 shrink-0 h-fit ${SEVERITY_CHIP[severity] ?? SEVERITY_CHIP.low}`}
      >
        {severity}
      </span>
      <p className="text-sm leading-relaxed">{message}</p>
    </li>
  );
}
