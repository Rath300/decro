import dynamic from 'next/dynamic'

const FeedPage = dynamic(() => import('@/components/feed-page'), { ssr: false })

export default function Feed() {
  return (
    <FeedPage />
  )
}


