import type { Metadata } from 'next'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { ConvexClientProvider } from './providers'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'AIRio — Apareça no ChatGPT',
  description: 'Otimize seu site para ser citado por ChatGPT, Gemini e Perplexity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
