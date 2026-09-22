import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

export const metadata: Metadata = pageMeta({
  title: 'Spotlights',
  description: 'Curated collections of work on Decro.',
  path: '/spotlight',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
