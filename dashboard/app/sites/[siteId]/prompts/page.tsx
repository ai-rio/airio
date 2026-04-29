'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      router.push(`/sites/${siteId}`);
    } finally {
      setSaving(false);
    }
  }

  const canSave = brandName.trim().length > 0 && prompts.some((p) => p.trim().length > 0);

  if (baskets === undefined) {
    return <div className="p-6 text-sm text-gray-500">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/sites/${siteId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-4 block"
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Monitoramento de Visibilidade</h1>
          <p className="text-sm text-gray-500 mt-1">
            7 amostras por prompt · motor: Perplexity · verificação semanal
          </p>
        </div>

        <Card>
          <CardContent className="py-4 px-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="brand-name">
                Nome da marca
              </label>
              <Input
                id="brand-name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: Airbnb"
              />
              <p className="text-xs text-gray-400 mt-1">
                Detectamos menções exatas (case-insensitive) nas respostas do Perplexity.
              </p>
            </div>

            <div>
              <p className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="text-xs text-red-400 hover:text-red-600 shrink-0"
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
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  + Adicionar prompt
                </button>
              )}
            </div>

            {existing && (
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Monitoramento ativo</p>
                  <p className="text-xs text-gray-400">Verificação automática semanal</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`text-xs font-medium rounded px-2 py-0.5 border transition-colors ${
                    enabled
                      ? 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
                      : 'text-gray-400 bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {enabled ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={save} disabled={saving || !canSave} className="w-full">
          {saving ? 'Salvando...' : existing ? 'Salvar alterações' : 'Criar monitoramento'}
        </Button>
      </div>
    </div>
  );
}
