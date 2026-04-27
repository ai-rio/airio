'use client'

import { useState } from 'react'
import { useAction, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth()
  const [url, setUrl] = useState('')
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastAuditId, setLastAuditId] = useState<string | null>(null)

  const runAudit = useAction(api.actions.audit.runAudit)
  const audits = useQuery(api.audits.listByUser,
    isAuthenticated ? { userId: '' } : 'skip'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setRunning(true)
    try {
      const result = await runAudit({ url })
      setLastAuditId(result.auditId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setRunning(false)
    }
  }

  if (!isAuthenticated) return <SignIn />

  return (
    <main className="max-w-2xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Nova Auditoria AEO</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Descubra por que seu site não aparece no ChatGPT — e corrija em segundos.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://seusite.com.br"
          required
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={running}
          className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {running ? 'Auditando…' : 'Auditar'}
        </button>
      </form>

      {error && (
        <p className="text-red-600 text-sm mb-6">{error}</p>
      )}

      {lastAuditId && (
        <a
          href={`/audit/${lastAuditId}`}
          className="block bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 mb-6"
        >
          Auditoria concluída — ver resultados →
        </a>
      )}

      {audits && audits.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Auditorias recentes
          </h2>
          <ul className="space-y-2">
            {audits.map(audit => (
              <li key={audit._id}>
                <a
                  href={`/audit/${audit._id}`}
                  className="flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50 text-sm"
                >
                  <span className="truncate text-gray-700">{audit.url}</span>
                  <span className={`ml-4 font-bold ${
                    audit.score != null
                      ? audit.score >= 70 ? 'text-green-600'
                      : audit.score >= 40 ? 'text-yellow-600'
                      : 'text-red-600'
                      : 'text-gray-400'
                  }`}>
                    {audit.score != null ? `${audit.score}/100` : audit.status}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function SignIn() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await signIn('resend', { email })
    setSent(true)
  }

  return (
    <main className="max-w-sm mx-auto py-24 px-4 text-center">
      <h1 className="text-2xl font-bold mb-2">AIRio</h1>
      <p className="text-gray-500 text-sm mb-8">Entre para auditar seu site</p>
      {sent ? (
        <p className="text-green-600 text-sm">Verifique seu email — enviamos um link de acesso.</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com.br"
            required
            className="border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            type="submit"
            className="bg-black text-white py-2 rounded-lg text-sm font-medium"
          >
            Entrar com email
          </button>
        </form>
      )}
    </main>
  )
}
