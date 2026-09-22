import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

export const metadata: Metadata = pageMeta({
  title: 'Groups',
  description: 'Creative rooms on Decro — photography, music, film, writing, design, and more.',
  path: '/subgroup',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
