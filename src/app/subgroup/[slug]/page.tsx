'use client'

import SiteHeader from '@/components/SiteHeader'
import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const label = params.slug?.replace(/-/g, ' ')
  const { posts } = usePosts()
  const cards: MediaCard[] = posts

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">{label}</h1>
        <CardGrid cards={cards} />
        <DetailModal />
      </main>
    </div>
  )
}


import SiteHeader from '@/components/SiteHeader'
import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const label = params.slug?.replace(/-/g, ' ')
  const { posts } = usePosts()
  const cards: MediaCard[] = posts

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">{label}</h1>
        <CardGrid cards={cards} />
        <DetailModal />
      </main>
    </div>
  )
}

