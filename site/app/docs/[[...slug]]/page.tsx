import { Callout } from 'fumadocs-ui/components/callout'
import { Card, Cards } from 'fumadocs-ui/components/card'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import defaultMdxComponents from 'fumadocs-ui/mdx'
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { docs } from '@/lib/source'

type Props = { params: Promise<{ slug?: string[] }> }

const mdxComponents = {
  ...defaultMdxComponents,
  Callout, Card, Cards, Step, Steps, Tab, Tabs,
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = docs.getPage(slug)
  if (!page) return {}

  const path = slug?.length ? `/${slug.join('/')}` : ''
  return {
    title: `${page.data.title} | AIRio Docs`,
    description: page.data.description,
    alternates: { canonical: `https://ai.rio.br/docs${path}` },
  }
}

export function generateStaticParams(): { slug: string[] }[] {
  return docs.generateParams()
}

export default async function DocsPageRoute({ params }: Props) {
  const { slug } = await params
  const page = docs.getPage(slug)
  if (!page) notFound()

  const Mdx = page.data.body

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <Mdx components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  )
}
