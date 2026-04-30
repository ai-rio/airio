import { AuditHistoryTable } from '@/components/audits/audit-history-table';

export default function AuditsPage() {
  return (
    <main>
      <div className="px-8 py-8 border-b border-border">
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.15em] mb-2">
          Histórico
        </p>
        <h1 className="font-[family-name:var(--font-bebas)] text-[48px] leading-none">
          AUDITORIAS
        </h1>
      </div>
      <div className="px-8 py-8">
        <AuditHistoryTable />
      </div>
    </main>
  );
}
