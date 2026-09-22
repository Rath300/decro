import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

export const metadata: Metadata = pageMeta({
  title: 'Trending',
  description: 'Work gaining views, likes, and comments on Decro right now.',
  path: '/trending',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
