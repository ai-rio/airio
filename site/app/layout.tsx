import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

const SITE_URL = process.env.TAGSMITH_BASE_URL ?? 'https://ai.rio.br'

export const metadata: Metadata = {
  title: 'Tagsmith — Apareça no ChatGPT antes do seu concorrente',
  description: 'Ferramenta brasileira de AEO. Audite seu site, gere llms.txt, corrija robots.txt e otimize conteúdo para ser citado por ChatGPT, Gemini e Perplexity.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Tagsmith — Apareça no ChatGPT antes do seu concorrente',
    description: 'Auditoria AEO em 60 segundos. Fixes gerados automaticamente.',
    url: SITE_URL,
    siteName: 'Tagsmith',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
