'use client';

import { Separator } from '@/components/ui/separator';

interface SidebarSection {
  id: string;
  label: string;
  count?: number;
}

interface AuditSidebarProps {
  sections: SidebarSection[];
  onDownloadLlms: () => void;
  onDownloadRobots: () => void;
}

export function AuditSidebar({ sections, onDownloadLlms, onDownloadRobots }: AuditSidebarProps) {
  return (
    <aside className="sticky top-14 self-start border-r border-border px-6 py-8 h-fit min-h-[200px]">
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-4">
        Neste relatório
      </p>
      <nav className="space-y-0.5">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="flex items-center justify-between py-2 px-2 font-[family-name:var(--font-mono)] text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
          >
            <span className="uppercase tracking-[0.05em]">{s.label}</span>
            {s.count != null && (
              <span className="font-[family-name:var(--font-bebas)] text-[16px] leading-none text-muted-foreground group-hover:text-foreground">
                {s.count}
              </span>
            )}
          </a>
        ))}
      </nav>

      <Separator className="my-6" />

      <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground uppercase tracking-[0.1em] mb-3">
        Downloads
      </p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={onDownloadLlms}
          className="w-full text-left px-3 py-2 bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[14px] hover:opacity-90 transition-opacity"
        >
          ↓ llms.txt
        </button>
        <button
          type="button"
          onClick={onDownloadRobots}
          className="w-full text-left px-3 py-2 border border-border text-foreground font-[family-name:var(--font-bebas)] text-[14px] hover:bg-muted transition-colors"
        >
          ↓ robots.txt
        </button>
      </div>
    </aside>
  );
}
