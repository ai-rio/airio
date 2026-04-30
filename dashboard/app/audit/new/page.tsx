'use client';

import { api } from 'airio-convex/_generated/api';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function NewAuditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteId = searchParams.get('siteId') ?? undefined;

  const runAudit = useAction(api.actions.audit.runAudit);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await runAudit({ url, ...(siteId ? { siteId } : {}) });
      router.push(`/audit/${result.auditId}`);
    } catch (err) {
      if (err instanceof ConvexError) {
        setError(typeof err.data === 'string' ? err.data : 'Erro ao iniciar auditoria');
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao iniciar auditoria');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-8 py-8 border-b border-border">
        <Link
          href="/"
          className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] hover:text-[var(--brand-text)] transition-colors"
        >
          ← Voltar
        </Link>
      </div>

      <div className="px-8 py-16 border-b border-border">
        <h1 className="font-[family-name:var(--font-bebas)] text-[72px] leading-none mb-4">
          Nova Auditoria
        </h1>
        <p className="text-muted-foreground">Insira a URL do site para análise AEO</p>
      </div>

      <div className="px-8 py-8">
        <form onSubmit={handleSubmit} className="max-w-xl flex flex-col gap-4">
          <input
            type="url"
            placeholder="https://exemplo.com.br"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[18px] h-12 px-8 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Analisando...' : 'Auditar'}
          </button>
          {error && (
            <div className="border border-[var(--brand-danger-border)] bg-[var(--brand-danger-muted)] px-4 py-3">
              <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-danger)] uppercase tracking-[0.1em]">
                {error}
              </p>
              {error.toLowerCase().includes('crédito') && (
                <Link
                  href="/billing"
                  className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-text)] uppercase tracking-[0.1em] hover:underline mt-2 inline-block"
                >
                  Adquirir créditos →
                </Link>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function NewAuditPage() {
  return (
    <Suspense>
      <NewAuditForm />
    </Suspense>
  );
}
