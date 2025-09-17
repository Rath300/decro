"use client"

import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import { StaggeredMenu } from '@/components/StaggeredMenu'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const label = params.slug?.replace(/-/g, ' ')
  const { posts } = usePosts()
  const [subgroupId, setSubgroupId] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subgroups').select('id').eq('slug', params.slug).single()
      setSubgroupId(data?.id ?? null)
    })()
  }, [params.slug])

  const cards: MediaCard[] = subgroupId ? posts.filter(p => p.subgroupId === subgroupId) : []

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <div className="fixed inset-0 z-50 pointer-events-none">
        <StaggeredMenu
          position="right"
          sections={[
            {
              title: 'Subgroups',
              items: [
                { label: 'decro-music', link: '/subgroup/decro-music' },
                { label: 'visual-art', link: '/subgroup/visual-art' },
                { label: 'film', link: '/subgroup/film' },
              ],
            },
            {
              title: 'Feed',
              items: [
                { label: 'Kendrick live set in LA — 4K remaster', link: '/feed' },
                { label: 'A24 behind the scenes on DP choices ...', link: '/feed' },
                { label: 'New indie playlist drop (Sep)', link: '/feed' },
              ],
            },
          ]}
          socialItems={[]}
          displaySocials={false}
          displayItemNumbering={false}
          menuButtonColor="#000"
          openMenuButtonColor="#000"
          changeMenuColorOnOpen={true}
          colors={['#f5f5f5', '#e5e7eb']}
          logoUrl="/logo.svg"
          accentColor="#000"
        />
      </div>
      <div className="sticky top-0 z-20 bg-white">
        <div className="border-b border-black">
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between">
            <div className="flex items-end gap-2">
              <a href="/feed" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Feed</a>
              <a href="/spotlight" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Spotlight</a>
              <a href="/subgroup" className={`px-14 py-2 border border-black -mb-px text-sm bg-black text-white transition-transform duration-150 active:translate-y-[1px]`}>Subgroup</a>
              <a href="/profile" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Profile</a>
            </div>
            <div className="flex items-center gap-4 pb-2 text-xs leading-6">
              <a href="/create" className="inline-flex items-center justify-center w-8 h-8 bg-black text-white border border-black">+</a>
              <a href="/" className="underline">Sign In</a>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-black"></div>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">{label}</h1>
        {cards.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black font-['Space_Mono']">No posts yet in this subgroup.</p>
          </div>
        ) : (
          <CardGrid cards={cards} />
        )}
        <DetailModal />
      </main>
    </div>
  )
}


