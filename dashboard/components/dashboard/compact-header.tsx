type CompactHeaderProps = { onAddSite: () => void };

export function CompactHeader({ onAddSite }: CompactHeaderProps) {
  return (
    <div className="px-8 py-4 border-b border-border flex items-center justify-between">
      <h1 className="font-[family-name:var(--font-bebas)] text-[28px] leading-none">DASHBOARD</h1>
      <button
        type="button"
        onClick={onAddSite}
        className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[16px] h-9 px-6 hover:opacity-90 transition-opacity cursor-pointer"
      >
        MONITORAR SITE →
      </button>
    </div>
  );
}
