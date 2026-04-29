import { DashboardNav } from '@/components/dashboard-nav';
import { cn } from '@/lib/utils';
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { Metadata } from 'next';
import { Bebas_Neue, Geist } from 'next/font/google';
import { ConvexClientProvider } from './providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });

export const metadata: Metadata = {
  title: 'AIRio — Apareça no ChatGPT',
  description: 'Otimize seu site para ser citado por ChatGPT, Gemini e Perplexity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="pt-BR" className={cn('font-sans dark', geist.variable, bebasNeue.variable)}>
        <body>
          <ConvexClientProvider>
            <DashboardNav />
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
