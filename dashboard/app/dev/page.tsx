import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

if (process.env.NODE_ENV === 'production') redirect('/');

async function enableBypass() {
  'use server';
  const store = await cookies();
  store.set('airio_dev_bypass', '1', { path: '/', maxAge: 60 * 60 * 24 * 7 });
  redirect('/');
}

async function disableBypass() {
  'use server';
  const store = await cookies();
  store.delete('airio_dev_bypass');
  redirect('/sign-in');
}

export default function DevPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">Dev tools</p>
        <h1 className="text-xl font-bold">Tagsmith — Dev Access</h1>
        <div className="flex gap-3 justify-center pt-2">
          <form action={enableBypass}>
            <button
              type="submit"
              className="bg-black text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Bypass auth →
            </button>
          </form>
          <form action={disableBypass}>
            <button type="submit" className="border px-5 py-2 rounded-lg text-sm font-medium">
              Clear cookie
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
