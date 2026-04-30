import { DashboardNav } from '@/components/dashboard-nav';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans, Space_Mono } from 'next/font/google';
import { ConvexClientProvider } from './providers';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });
const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
});
const bebasNeue = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' });

export const metadata: Metadata = {
  title: 'AIRio — Apareça no ChatGPT',
  description: 'Otimize seu site para ser citado por ChatGPT, Gemini e Perplexity.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="pt-BR"
        className={cn('font-sans dark', dmSans.variable, spaceMono.variable, bebasNeue.variable)}
      >
        <body>
          <ConvexClientProvider>
            <DashboardNav />
            <TooltipProvider>{children}</TooltipProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
