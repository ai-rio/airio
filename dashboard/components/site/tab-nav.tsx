'use client';

interface Tab {
  id: string;
  label: string;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export function TabNav({ tabs, activeTab, onChange }: TabNavProps) {
  return (
    <div className="flex border-b border-border px-8">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            'font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] px-4 py-3 border-b-2 transition-colors',
            activeTab === t.id
              ? 'border-[var(--brand)] text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
