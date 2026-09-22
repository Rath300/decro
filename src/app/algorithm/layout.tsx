import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'

export const metadata: Metadata = pageMeta({
  title: 'How ranking works',
  description: 'Decro uses a fair-exposure ranking so newer work can surface without an engagement trap.',
  path: '/algorithm',
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
