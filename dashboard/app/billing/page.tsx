'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { api } from 'airio-convex/_generated/api';
import { useAction, useQuery } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const PACKS = [
  { id: 'credits_10' as const, label: '10 créditos', price: 'R$49', note: 'R$4,90/auditoria' },
  { id: 'credits_30' as const, label: '30 créditos', price: 'R$99', note: 'R$3,30/auditoria' },
  { id: 'credits_100' as const, label: '100 créditos', price: 'R$249', note: 'R$2,49/auditoria' },
];

export default function BillingPage() {
  const { isAuthenticated } = useConvexAuth();
  const searchParams = useSearchParams();
  const success = searchParams.get('success') === '1';
  const [loading, setLoading] = useState<string | null>(null);

  const createCheckout = useAction(api.actions.checkout.createCheckoutSession);

  async function handleBuy(product: (typeof PACKS)[0]['id']) {
    setLoading(product);
    try {
      const { checkoutUrl } = await createCheckout({ product });
      if (checkoutUrl) window.location.href = checkoutUrl;
    } finally {
      setLoading(null);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <main className="max-w-xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Créditos</h1>
      <p className="text-sm text-gray-500 mb-8">
        1 crédito = 1 auditoria AEO completa com fixes gerados.
      </p>

      {success && (
        <div className="mb-6 bg-[var(--brand-success-muted)] border border-[var(--brand-success-border)] p-4 text-sm text-[var(--brand-success)]">
          Pagamento confirmado. Créditos adicionados à sua conta.
        </div>
      )}

      <div className="space-y-3">
        {PACKS.map((pack) => (
          <div key={pack.id} className="border border-border p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold">{pack.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{pack.note}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold">{pack.price}</span>
              <button
                type="button"
                onClick={() => handleBuy(pack.id)}
                disabled={loading === pack.id}
                className="bg-[var(--brand)] text-[var(--brand-fg)] px-5 py-2 font-[family-name:var(--font-bebas)] text-[16px] tracking-wide disabled:opacity-50"
              >
                {loading === pack.id ? '…' : 'Comprar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Pagamento seguro via DodoPayments. Aceita cartão e PIX.
      </p>
    </main>
  );
}
