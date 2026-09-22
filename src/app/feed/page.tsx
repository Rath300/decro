import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { pageMeta } from '@/lib/seo'

const FeedPage = dynamic(() => import('@/components/feed-page'), { ssr: false })

export const metadata: Metadata = pageMeta({
  title: 'Feed',
  description:
    'Discover creative content from artists, musicians, photographers, and creators. Chronologically organized, no algorithm.',
  path: '/feed',
})

export default function Feed() {
  return <FeedPage />
}


