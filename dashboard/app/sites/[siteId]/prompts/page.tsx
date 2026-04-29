'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from 'airio-convex/_generated/api';
import type { Id } from 'airio-convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const MAX_PROMPTS = 5;

export default function PromptsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const router = useRouter();

  const baskets = useQuery(api.promptBaskets.listBySite, {
    siteId: siteId as Id<'sites'>,
  });
  const createBasket = useMutation(api.promptBaskets.create);
  const updateBasket = useMutation(api.promptBaskets.update);

  const existing = baskets?.[0] ?? null;

  const [brandName, setBrandName] = useState('');
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setBrandName(existing.brandName);
      setPrompts(existing.prompts.length > 0 ? existing.prompts : ['']);
      setEnabled(existing.enabled);
    }
  }, [existing]);

  function addPrompt() {
    if (prompts.length >= MAX_PROMPTS) return;
    setPrompts([...prompts, '']);
  }

  function removePrompt(idx: number) {
    setPrompts(prompts.filter((_, i) => i !== idx));
  }

  function updatePrompt(idx: number, value: string) {
    setPrompts(prompts.map((p, i) => (i === idx ? value : p)));
  }

  async function save() {
    const filtered = prompts.filter((p) => p.trim().length > 0);
    if (!brandName.trim() || filtered.length === 0) return;
    setSaving(true);
    try {
      if (existing) {
        await updateBasket({
          basketId: existing._id as Id<'promptBaskets'>,
          brandName: brandName.trim(),
          prompts: filtered,
          enabled,
        });
      } else {
        await createBasket({
          siteId: siteId as Id<'sites'>,
          brandName: brandName.trim(),
          prompts: filtered,
          engine: 'perplexity',
        });
      }
      router.push(`/sites/${siteId}/monitoring`);
    } finally {
      setSaving(false);
    }
  }

  const canSave = brandName.trim().length > 0 && prompts.some((p) => p.trim().length > 0);

  if (baskets === undefined) {
    return (
      <div className="p-8 font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
        Carregando…
      </div>
    );
  }

  return (
    <main className="max-w-lg mx-auto py-12 px-4">
      <button
        type="button"
        onClick={() => router.push(`/sites/${siteId}/monitoring`)}
        className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] hover:text-[var(--brand-text)] transition-colors mb-8 block"
      >
        ← Voltar
      </button>

      <div className="border-b border-border pb-6 mb-8">
        <h1 className="font-[family-name:var(--font-bebas)] text-[40px] leading-none text-foreground">
          Monitoramento de Visibilidade
        </h1>
        <p className="font-[family-name:var(--font-mono)] text-[11px] text-muted-foreground uppercase tracking-[0.1em] mt-2">
          7 amostras por prompt · motor: Perplexity · verificação semanal
        </p>
      </div>

      <div className="space-y-6">
        <div className="border-b border-border pb-6">
          <label
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-2 block"
            htmlFor="brand-name"
          >
            Nome da marca
          </label>
          <Input
            id="brand-name"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex: Airbnb"
          />
          <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground mt-1.5">
            Detectamos menções exatas (case-insensitive) nas respostas do Perplexity.
          </p>
        </div>

        <div className="border-b border-border pb-6">
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground mb-3">
            Prompts ({prompts.length}/{MAX_PROMPTS})
          </p>
          <div className="space-y-2">
            {prompts.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: order is stable
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={p}
                  onChange={(e) => updatePrompt(i, e.target.value)}
                  placeholder="Ex: Qual a melhor plataforma para alugar imóveis?"
                />
                {prompts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePrompt(i)}
                    className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--brand-danger)] hover:opacity-70 transition-opacity shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {prompts.length < MAX_PROMPTS && (
            <button
              type="button"
              onClick={addPrompt}
              className="mt-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--brand-text)] hover:opacity-70 transition-opacity"
            >
              + Adicionar prompt
            </button>
          )}
        </div>

        {existing && (
          <div className="flex items-center justify-between border-b border-border pb-6">
            <div>
              <p className="text-sm font-medium text-foreground">Monitoramento ativo</p>
              <p className="font-[family-name:var(--font-mono)] text-[10px] text-muted-foreground mt-0.5">
                Verificação automática semanal
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-11 h-6 relative border transition-colors ${
                enabled ? 'bg-[var(--brand)] border-[var(--brand)]' : 'bg-muted border-border'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-background transition-all ${
                  enabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        )}

        <Button onClick={save} disabled={saving || !canSave} className="w-full">
          {saving ? 'Salvando…' : existing ? 'Salvar alterações' : 'Criar monitoramento'}
        </Button>
      </div>
    </main>
  );
}
