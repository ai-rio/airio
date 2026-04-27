// Dev-only page — bypasses auth for local development
// Access: http://localhost:3002/dev
// Sets cookie: airio_dev_bypass=1

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DevPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>
}) {
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  const { action } = await searchParams

  if (action === 'enable') {
    const store = await cookies()
    store.set('airio_dev_bypass', '1', { path: '/', maxAge: 60 * 60 * 24 * 7 })
    redirect('/')
  }

  if (action === 'disable') {
    const store = await cookies()
    store.delete('airio_dev_bypass')
    redirect('/sign-in')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">Dev tools</p>
        <h1 className="text-xl font-bold">AIRio — Dev Access</h1>
        <div className="flex gap-3 justify-center pt-2">
          <a
            href="/dev?action=enable"
            className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium"
          >
            Bypass auth →
          </a>
          <a
            href="/dev?action=disable"
            className="border px-5 py-2 rounded-lg text-sm font-medium"
          >
            Clear cookie
          </a>
        </div>
      </div>
    </main>
  )
}
