'use client';

import { AddSiteModal } from '@/components/add-site-modal';
import { CompactHeader } from '@/components/dashboard/compact-header';
import { EmptyHero } from '@/components/dashboard/empty-hero';
import { SiteRowsTable } from '@/components/dashboard/site-rows-table';
import { StatsRow } from '@/components/dashboard/stats-row';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'airio-convex/_generated/api';
import { useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useState } from 'react';

type Site = {
  _id: string;
  name: string;
  url: string;
  schedule: 'weekly' | 'monthly';
  monitoringEnabled: boolean;
  nextAuditAt: number;
};

type Audit = {
  _id: string;
  score: number | null;
  status: string;
  _creationTime: number;
  outputFiles?: string;
};

type AuditWithSite = Audit & { siteId?: string };

export default function DashboardPage({ isDevBypass = false }: { isDevBypass?: boolean }) {
  const { isAuthenticated: convexAuth } = useConvexAuth();
  const isAuthenticated = convexAuth || isDevBypass;
  const [modalOpen, setModalOpen] = useState(false);

  const sites = useQuery(api.sites.listByUser, isAuthenticated ? {} : 'skip');
  const allAudits = useQuery(api.audits.listByUser, isAuthenticated ? {} : 'skip');
  const balance = useQuery(api.users.getMyCreditsBalance, convexAuth ? {} : 'skip');

  if (!isAuthenticated) return <SignIn />;

  const avgScore: string = (() => {
    if (!sites || !allAudits || sites.length === 0) return '—';
    const latestBySite = new Map<string, number>();
    for (const audit of allAudits as AuditWithSite[]) {
      if (!audit.siteId || audit.score === null) continue;
      if (!latestBySite.has(audit.siteId)) latestBySite.set(audit.siteId, audit.score);
    }
    if (latestBySite.size === 0) return '—';
    const sum = [...latestBySite.values()].reduce((a, b) => a + b, 0);
    return Math.round(sum / latestBySite.size).toString();
  })();

  const planLabel =
    balance !== undefined
      ? balance.freeRemaining > 0
        ? 'PLANO FREE'
        : `${balance.remaining} CRÉDITOS`
      : 'PLANO FREE';

  // Zero sites state: hero
  if (sites !== undefined && sites.length === 0) {
    return (
      <>
        <EmptyHero
          onAddSite={() => setModalOpen(true)}
          sitesCount={0}
          avgScore={avgScore}
          planLabel={planLabel}
        />
        {modalOpen && <AddSiteModal onCloseAction={() => setModalOpen(false)} />}
      </>
    );
  }

  // 1+ sites state (or loading): compact header + stats + rows
  return (
    <>
      <CompactHeader onAddSite={() => setModalOpen(true)} />
      <StatsRow sitesCount={sites?.length ?? 0} avgScore={avgScore} avgPsos="—" alertsCount={0} />
      <div className="px-8 py-8">
        <SiteRowsTable sites={sites as Site[] | undefined} />
      </div>
      {modalOpen && <AddSiteModal onCloseAction={() => setModalOpen(false)} />}
    </>
  );
}

function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    await signIn('resend', { email, redirectTo: '/' });
    setSent(true);
  }

  return (
    <main className="max-w-sm mx-auto py-24 px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">AIRio</h1>
      <p className="text-muted-foreground text-sm mb-8">Entre para auditar seu site</p>
      {sent ? (
        <p className="text-[var(--brand-success)] text-sm">
          Verifique seu email — enviamos um link de acesso.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            required
            className="w-full border border-border bg-background text-foreground px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            className="bg-[var(--brand)] text-[var(--brand-fg)] py-2 font-[family-name:var(--font-bebas)] text-[16px] tracking-wide w-full"
          >
            Entrar com email
          </button>
        </form>
      )}
    </main>
  );
}
