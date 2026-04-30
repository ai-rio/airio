'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from 'airio-convex/_generated/api';
import { useMutation } from 'convex/react';
import { useState } from 'react';

export function AddSiteModal({ onCloseAction }: { onCloseAction: () => void }) {
  const createSite = useMutation(api.sites.create);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [schedule, setSchedule] = useState<'weekly' | 'monthly'>('weekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createSite({ name, url, schedule });
      onCloseAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar site');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-card border border-border w-full max-w-md p-8">
        <h2 className="font-[family-name:var(--font-bebas)] text-[32px] leading-none text-foreground mb-6">
          Adicionar Site
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-name"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              Nome
            </label>
            <Input
              id="modal-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meu site"
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-url"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              URL
            </label>
            <Input
              id="modal-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://seusite.com.br"
              required
              disabled={submitting}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-schedule"
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-muted-foreground"
            >
              Frequência
            </label>
            <select
              id="modal-schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as 'weekly' | 'monthly')}
              disabled={submitting}
              className="w-full border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
            </select>
          </div>
          {error && <p className="text-sm text-[var(--brand-danger)]">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Criando…' : 'Criar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCloseAction} disabled={submitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
