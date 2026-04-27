import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIRio — Apareça no ChatGPT antes do seu concorrente',
  description: 'Ferramenta brasileira de AEO. Audite seu site, gere llms.txt, corrija robots.txt e otimize conteúdo para ser citado por ChatGPT, Gemini e Perplexity.',
  metadataBase: new URL('https://ai.rio.br'),
  openGraph: {
    title: 'AIRio — Apareça no ChatGPT antes do seu concorrente',
    description: 'Auditoria AEO em 60 segundos. Fixes gerados automaticamente.',
    url: 'https://ai.rio.br',
    siteName: 'AIRio',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
