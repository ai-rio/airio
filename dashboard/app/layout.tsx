import type { Metadata } from 'next'
import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server'
import { ConvexClientProvider } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIRio — Apareça no ChatGPT',
  description: 'Otimize seu site para ser citado por ChatGPT, Gemini e Perplexity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="pt-BR">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
