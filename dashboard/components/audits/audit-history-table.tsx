'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';

type AuditRow = {
  _id: string;
  url: string;
  status: string;
  score?: number | null;
  createdAt: number;
};

type SortKey = 'url' | 'createdAt' | 'score' | 'status';
type SortDir = 'asc' | 'desc';

function scoreColorClass(score: number | null | undefined): string {
  if (score == null) return 'text-muted-foreground';
  if (score >= 70) return 'text-[var(--brand-text)]';
  if (score >= 40) return 'text-[var(--brand-blue)]';
  return 'text-[var(--brand-danger)]';
}

const STATUS_CHIP: Record<string, string> = {
  complete:
    'bg-[var(--brand-success-muted)] text-[var(--brand-success)] border border-[var(--brand-success-border)]',
  pending: 'bg-muted text-muted-foreground border border-border',
  failed:
    'bg-[var(--brand-danger-muted)] text-[var(--brand-danger)] border border-[var(--brand-danger-border)]',
};

const STATUS_LABEL: Record<string, string> = {
  complete: 'Completo',
  pending: 'Pendente',
  failed: 'Falha',
};

const COL_CLASSES = 'grid grid-cols-[1fr_auto_auto_auto_auto] gap-6 px-8';

const COLUMNS: { label: string; key: SortKey | null }[] = [
  { label: 'Site / URL', key: 'url' },
  { label: 'Data', key: 'createdAt' },
  { label: 'Score AEO', key: 'score' },
  { label: 'Status', key: 'status' },
  { label: '', key: null },
];

function sortAudits(audits: AuditRow[], key: SortKey, dir: SortDir): AuditRow[] {
  return [...audits].sort((a, b) => {
    let cmp = 0;
    if (key === 'url') cmp = a.url.localeCompare(b.url);
    else if (key === 'createdAt') cmp = a.createdAt - b.createdAt;
    else if (key === 'score') cmp = (a.score ?? -1) - (b.score ?? -1);
    else if (key === 'status') cmp = a.status.localeCompare(b.status);
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function AuditHistoryTable() {
  const audits = useQuery(api.audits.listByUser);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  if (audits === undefined) {
    return (
      <div className="border border-border">
        <div className={`${COL_CLASSES} py-3 border-b border-border bg-muted`}>
          {COLUMNS.map((col) => (
            <span
              key={col.label}
              className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
            >
              {col.label}
            </span>
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${COL_CLASSES} py-4 border-b border-border last:border-b-0`}>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground px-8 py-12">
        Nenhuma auditoria ainda.
      </p>
    );
  }

  const sorted = sortAudits(audits as AuditRow[], sortKey, sortDir);

  return (
    <div className="border border-border">
      <div className={`${COL_CLASSES} py-3 border-b border-border bg-muted`}>
        {COLUMNS.map((col) => {
          if (!col.key) {
            return <span key="action" />;
          }
          const active = sortKey === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => handleSort(col.key as SortKey)}
              className={[
                'flex items-center gap-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.15em] transition-colors text-left',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {col.label}
              <span className="text-[8px] leading-none">
                {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
              </span>
            </button>
          );
        })}
      </div>
      {sorted.map((audit) => (
        <div
          key={audit._id}
          className={`${COL_CLASSES} py-4 border-b border-border last:border-b-0 hover:bg-muted/50 items-center`}
        >
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-foreground truncate">
            {audit.url}
          </span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground whitespace-nowrap">
            {new Date(audit.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <span
            className={`font-[family-name:var(--font-bebas)] text-[32px] leading-none ${scoreColorClass(audit.score)}`}
          >
            {audit.score != null ? audit.score : '—'}
          </span>
          <span
            className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.1em] px-2 py-1 whitespace-nowrap ${STATUS_CHIP[audit.status] ?? STATUS_CHIP.pending}`}
          >
            {STATUS_LABEL[audit.status] ?? audit.status}
          </span>
          <Link
            href={`/audit/${audit._id}`}
            className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:opacity-80 whitespace-nowrap"
          >
            Ver →
          </Link>
        </div>
      ))}
    </div>
  );
}
