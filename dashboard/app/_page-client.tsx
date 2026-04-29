'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'airio-convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type Audit = {
  _id: string;
  url: string;
  score: number | null;
  status: string;
  _creationTime: number;
};

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-[var(--brand-success)]';
  if (score >= 40) return 'text-[var(--brand-warning)]';
  return 'text-[var(--brand-danger)]';
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function buildDeltaMap(audits: Audit[]): Map<string, number | null> {
  const groups = new Map<string, Audit[]>();
  for (const a of audits) {
    const h = getHostname(a.url);
    const g = groups.get(h) ?? [];
    g.push(a);
    groups.set(h, g);
  }
  for (const [h, g] of groups) {
    groups.set(
      h,
      [...g].sort((a, b) => b._creationTime - a._creationTime)
    );
  }
  const deltaMap = new Map<string, number | null>();
  for (const [, g] of groups) {
    for (let i = 0; i < g.length; i++) {
      const curr = g[i];
      if (curr.score === null) {
        deltaMap.set(curr._id, null);
        continue;
      }
      const prev = g.slice(i + 1).find((a) => a.score !== null);
      if (!prev) {
        deltaMap.set(curr._id, null);
      } else {
        const d = curr.score - (prev.score as number);
        deltaMap.set(curr._id, d === 0 ? null : d);
      }
    }
  }
  return deltaMap;
}

export default function DashboardPage({ isDevBypass = false }: { isDevBypass?: boolean }) {
  const { isAuthenticated: convexAuth } = useConvexAuth();
  const isAuthenticated = convexAuth || isDevBypass;
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useAction(api.actions.audit.runAudit);
  const audits = useQuery(api.audits.listByUser, isAuthenticated ? {} : 'skip');
  const balance = useQuery(api.users.getMyCreditsBalance, convexAuth ? {} : 'skip');
  const sites = useQuery(api.sites.listByUser, isAuthenticated ? {} : 'skip');

  const deltaMap = useMemo(() => {
    if (!audits) return new Map<string, number | null>();
    return buildDeltaMap(audits);
  }, [audits]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRunning(true);
    try {
      const result = await runAudit({ url });
      router.push(`/audit/${result.auditId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setRunning(false);
    }
  }

  if (!isAuthenticated) return <SignIn />;

  const zeroCreditsBanner =
    convexAuth && balance !== undefined && balance.remaining === 0 && balance.freeRemaining === 0;

  return (
    <>
      <main className="max-w-2xl mx-auto py-10 px-4 space-y-8">
        <section>
          <h1 className="text-xl font-semibold mb-4">Nova auditoria AEO</h1>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seusite.com.br"
              required
              disabled={running}
              className="flex-1"
            />
            <Button type="submit" disabled={running}>
              {running ? 'Auditando…' : 'Auditar'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-[var(--brand-danger)]">{error}</p>}
        </section>

        {zeroCreditsBanner && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--brand-warning-border)] bg-[var(--brand-warning-muted)] px-4 py-3 text-sm text-foreground">
            <span>Você não tem créditos. Compre um pacote para continuar auditando.</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-[var(--brand-warning-border)] text-foreground hover:bg-[var(--brand-warning-muted)]"
              onClick={() => router.push('/billing')}
            >
              Comprar
            </Button>
          </div>
        )}

        {isAuthenticated && sites && sites.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Sites monitorados</h2>
              <span className="text-xs text-muted-foreground">{sites.length} site(s)</span>
            </div>
            <Card>
              <CardContent className="p-0">
                {(sites as any[]).map((site: any, idx: number) => (
                  <div key={site._id}>
                    {idx > 0 && <Separator />}
                    <button
                      type="button"
                      onClick={() => router.push(`/sites/${site._id}`)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <div className="font-medium">{site.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{site.url}</div>
                      </div>
                      <span className="text-muted-foreground shrink-0">›</span>
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {convexAuth && (
          <section>
            <h2 className="text-base font-semibold mb-3">Auditorias recentes</h2>
            {audits === undefined ? null : audits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <span className="text-3xl mb-3">🔍</span>
                <p className="text-sm">
                  Nenhuma auditoria ainda. Envie uma URL acima para começar.
                </p>
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {(audits as Audit[]).map((audit: Audit, idx: number) => {
                    const isPending = audit.status === 'pending' || audit.score === null;
                    const delta = deltaMap.get(audit._id) ?? null;
                    return (
                      <div key={audit._id}>
                        {idx > 0 && <Separator />}
                        <button
                          type="button"
                          onClick={() => router.push(`/audit/${audit._id}`)}
                          className="w-full flex items-center gap-4 px-4 py-3 text-sm hover:bg-muted/50 transition-colors text-left"
                        >
                          <span className="flex-1 font-medium truncate">
                            {getHostname(audit.url)}
                          </span>
                          <span className="text-muted-foreground text-xs shrink-0">
                            {formatDate(audit._creationTime)}
                          </span>
                          <span className="w-16 text-right shrink-0">
                            {isPending ? (
                              <span className="text-muted-foreground">⏳ processando…</span>
                            ) : (
                              <span className={cn('font-semibold', scoreColor(audit.score ?? 0))}>
                                {audit.score}/100
                              </span>
                            )}
                          </span>
                          {!isPending && delta !== null && (
                            <span
                              className={cn(
                                'w-12 text-right text-xs font-medium shrink-0',
                                delta > 0
                                  ? 'text-[var(--brand-success)]'
                                  : 'text-[var(--brand-danger)]'
                              )}
                            >
                              {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`}
                            </span>
                          )}
                          {(isPending || delta === null) && (
                            <span className="w-12 shrink-0" aria-hidden />
                          )}
                          <span className="text-muted-foreground shrink-0">›</span>
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </section>
        )}
      </main>
    </>
  );
}

function SignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signIn('resend', { email, redirectTo: '/' });
    setSent(true);
  }

  return (
    <main className="max-w-sm mx-auto py-24 px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">AIRio</h1>
      <p className="text-muted-foreground text-sm mb-8">Entre para auditar seu site</p>
      {sent ? (
        <p className="text-green-600 text-sm">Verifique seu email — enviamos um link de acesso.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            required
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button type="submit" className="bg-black text-white py-2 rounded-lg text-sm font-medium">
            Entrar com email
          </button>
        </form>
      )}
    </main>
  );
}
