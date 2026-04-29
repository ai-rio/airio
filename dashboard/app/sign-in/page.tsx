'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn('resend', { email, redirectTo });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-bebas)] text-[40px] leading-none">
            AIR<span className="text-[var(--brand-text)]">IO</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apareça no ChatGPT antes do seu concorrente.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-[var(--brand-success)] text-sm font-medium">Link enviado!</p>
            <p className="text-muted-foreground text-sm mt-1">
              Verifique seu email — clique no link para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              required
              className="w-full border border-border bg-background text-foreground px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--brand)] text-[var(--brand-fg)] py-2.5 font-[family-name:var(--font-bebas)] text-[16px] tracking-wide disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Entrar com email'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao entrar, você concorda com nossos{' '}
          <a href="https://ai.rio.br/termos" className="underline">
            Termos de Uso
          </a>
          .
        </p>
      </div>
    </main>
  );
}
