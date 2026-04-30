interface BrandSignalsProps {
  wikipedia: string | null;
  reddit: string | null;
  youtube: string | null;
  rslPresent: boolean;
}

const PLATFORMS = ['wikipedia', 'reddit', 'youtube'] as const;

export function BrandSignals({ wikipedia, reddit, youtube, rslPresent }: BrandSignalsProps) {
  const urls: Record<string, string | null> = { wikipedia, reddit, youtube };

  return (
    <div className="space-y-2">
      {PLATFORMS.map((platform) => {
        const url = urls[platform];
        const present = Boolean(url);
        return present ? (
          <a
            key={platform}
            href={url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2.5 border border-[var(--brand-success-border)] bg-[var(--brand-success-muted)] hover:opacity-80 transition-opacity"
          >
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em] capitalize text-[var(--brand-success)]">
              {platform}
            </span>
            <span className="text-[var(--brand-success)] text-sm">✓</span>
          </a>
        ) : (
          <div
            key={platform}
            className="flex items-center justify-between px-3 py-2.5 border border-border bg-muted"
          >
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em] capitalize text-muted-foreground">
              {platform}
            </span>
            <span className="text-muted-foreground text-sm">✗</span>
          </div>
        );
      })}
      <div
        className={`flex items-center justify-between px-3 py-2.5 border ${
          rslPresent
            ? 'border-[var(--brand-success-border)] bg-[var(--brand-success-muted)]'
            : 'border-border bg-muted'
        }`}
      >
        <span
          className={`font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.05em] ${
            rslPresent ? 'text-[var(--brand-success)]' : 'text-muted-foreground'
          }`}
        >
          RSL 1.0
        </span>
        <span className={rslPresent ? 'text-[var(--brand-success)]' : 'text-muted-foreground'}>
          {rslPresent ? '✓' : '✗'}
        </span>
      </div>
    </div>
  );
}
