import { loader } from 'fumadocs-core/source'
import { createMDXSource } from 'fumadocs-mdx'
import {
  blog as blogCollection,
  docs as docsCollection,
  meta as docsMeta,
} from '@/.source'

export const blog = loader({
  baseUrl: '/blog',
  source: createMDXSource(blogCollection, []),
})

export const docs = loader({
  baseUrl: '/docs',
  source: createMDXSource(docsCollection, docsMeta),
})
