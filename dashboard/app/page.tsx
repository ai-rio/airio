import { cookies } from 'next/headers';
import DashboardPage from './_page-client';

export default async function Page() {
  const store = await cookies();
  const isDevBypass =
    process.env.NODE_ENV !== 'production' && store.get('airio_dev_bypass')?.value === '1';

  return <DashboardPage isDevBypass={isDevBypass} />;
}
