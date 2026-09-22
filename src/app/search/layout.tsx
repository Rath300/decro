import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

export const metadata: Metadata = pageMeta({
  title: 'Search',
  description: 'Search posts, tags, and creators on Decro.',
  path: '/search',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
