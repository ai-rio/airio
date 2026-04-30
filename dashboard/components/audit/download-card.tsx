interface DownloadCardProps {
  title: string;
  description: string;
  tag?: string;
  tagPrimary?: boolean;
  onClick: () => void;
}

export function DownloadCard({ title, description, tag, tagPrimary, onClick }: DownloadCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card p-6 text-left hover:bg-muted transition-colors w-full group"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="font-[family-name:var(--font-bebas)] text-[22px] leading-none text-foreground">
          {title}
        </p>
        {tag && (
          <span
            className={`font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-[0.1em] px-2 py-0.5 ${
              tagPrimary
                ? 'bg-[var(--brand)] text-[var(--brand-fg)]'
                : 'bg-muted text-muted-foreground border border-border'
            }`}
          >
            {tag}
          </span>
        )}
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground mb-4">
        {description}
      </p>
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] group-hover:underline">
        ↓ BAIXAR
      </p>
    </button>
  );
}
