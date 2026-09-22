import type { Metadata } from 'next'
import { pageMeta, siteDescription } from '@/lib/seo'
import Home from './home-page-client'

export const metadata: Metadata = pageMeta({
  title: 'Decro',
  description: siteDescription(),
  path: '/',
})

export default function Page() {
  return <Home />
}
