import type { Metadata } from 'next'
import { noIndexMeta } from '@/lib/seo'

export const metadata: Metadata = noIndexMeta('Log in', '/login')

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
