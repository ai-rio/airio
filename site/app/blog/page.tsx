import type { Metadata } from 'next'
import Link from 'next/link'
import { blog } from '@/lib/source'

export const metadata: Metadata = {
  title: 'Blog — AEO, IA e visibilidade digital | AIRio',
  description: 'Guias sobre AEO, otimização para ChatGPT, Gemini e Perplexity, e como aparecer nas respostas de IA.',
  alternates: { canonical: `${process.env.TAGSMITH_BASE_URL ?? 'https://ai.rio.br'}/blog` },
}

export default function BlogIndexPage() {
  const posts = blog
    .getPages()
    .sort((a, b) =>
      new Date(b.data.date as string).getTime() - new Date(a.data.date as string).getTime()
    )

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">Blog</h1>
      <p className="text-gray-500 mb-12">
        AEO, otimização para IA e como aparecer no ChatGPT antes do seu concorrente.
      </p>
      <ul className="flex flex-col gap-8">
        {posts.map(post => (
          <li key={post.url}>
            <Link href={post.url} className="group block">
              <p className="text-sm text-gray-400 mb-1">
                {new Date(post.data.date as string).toLocaleDateString('pt-BR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
                {(post.data.tags as string[]).length > 0 && (
                  <span className="ml-3">
                    {(post.data.tags as string[]).map(tag => (
                      <span key={tag} className="mr-2 opacity-60">#{tag}</span>
                    ))}
                  </span>
                )}
              </p>
              <h2 className="text-xl font-semibold group-hover:underline">{post.data.title}</h2>
              <p className="mt-1 text-gray-500">{post.data.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
