import { InlineTOC } from 'fumadocs-ui/components/inline-toc'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { blog } from '@/lib/source'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = blog.getPage([slug])
  if (!page) notFound()

  return {
    title: `${page.data.title} | AIRio Blog`,
    description: page.data.description,
    alternates: { canonical: `${process.env.TAGSMITH_BASE_URL ?? 'https://ai.rio.br'}/blog/${slug}` },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      type: 'article',
      publishedTime: new Date(page.data.date as string).toISOString(),
      authors: [String(page.data.author)],
    },
  }
}

export function generateStaticParams(): { slug: string }[] {
  return blog.getPages().map(page => ({ slug: page.slugs[0] }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const page = blog.getPage([slug])
  if (!page) notFound()

  const Mdx = page.data.body

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <Link href="/blog" className="text-sm text-gray-400 hover:underline mb-8 block">
        ← Todos os posts
      </Link>
      <header className="mb-10">
        <h1 className="text-4xl font-bold mb-3">{page.data.title}</h1>
        <p className="text-gray-500 text-lg mb-4">{page.data.description}</p>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>{String(page.data.author)}</span>
          <span>·</span>
          <span>
            {new Date(page.data.date as string).toLocaleDateString('pt-BR', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </span>
          {(page.data.tags as string[]).length > 0 && (
            <>
              <span>·</span>
              <span>{(page.data.tags as string[]).map(t => `#${t}`).join(' ')}</span>
            </>
          )}
        </div>
      </header>
      <InlineTOC items={page.data.toc} />
      <article className="prose prose-neutral mt-8">
        <Mdx components={defaultMdxComponents} />
      </article>
    </div>
  )
}
