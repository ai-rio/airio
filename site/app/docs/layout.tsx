import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider'
import type { ReactNode } from 'react'
import { docs } from '@/lib/source'
import 'fumadocs-ui/style.css'

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={docs.pageTree}
        nav={{
          title: (
            <span className="flex items-baseline gap-1">
              <span className="text-sm font-bold tracking-tight">AIRio</span>
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-50 ml-1">docs</span>
            </span>
          ),
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
