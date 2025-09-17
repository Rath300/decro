"use client"

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import Identity from '@/components/Identity'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth-modal'
import { StaggeredMenu } from '@/components/StaggeredMenu'

type Subgroup = { id: string; name: string; slug: string; description?: string | null }

export default function SubgroupIndex() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Subgroup[]>([])
  const [filtered, setFiltered] = useState<Subgroup[]>([])
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('subgroups').select('id,name,slug,description').order('name')
      setItems(data || [])
      setFiltered(data || [])
    })()
  }, [])

  useEffect(() => {
    const v = q.trim().toLowerCase()
    if (!v) { setFiltered(items); return }
    setFiltered(items.filter(s => s.name.toLowerCase().includes(v) || s.slug.toLowerCase().includes(v)))
  }, [q, items])

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
              <Identity />
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-black"></div>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Subgroups</h1>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthAction('create a niche')
                setShowAuthModal(true)
              } else {
                router.push('/subgroup/create')
              }
            }}
            className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white text-sm"
          >
            Create Niche
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search subgroups..."
          className="w-full p-3 border border-gray-300 text-sm text-black mb-6"
        />

        {filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black">No subgroups yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((s) => (
              <Link key={s.id} href={`/subgroup/${s.slug}`} className="border border-black p-3 bg-white hover:bg-gray-50">
                <div className="text-black font-bold mb-1">{s.name}</div>
                <div className="text-xs text-gray-600">/{s.slug}</div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} />
    </div>
  )
}


