'use client'

import { useEffect, useState } from 'react'
import Identity from '@/components/Identity'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth-modal'
import Link from 'next/link'

type SpotlightItem = { id: string; url: string; caption: string }
type Spotlight = { id: string; title: string; blurb?: string; items: SpotlightItem[] }

export default function SpotlightPage() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem('spotlights')
      setSpotlights(raw ? JSON.parse(raw) : [])
    } catch {
      setSpotlights([])
    }
  }, [])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <div className="sticky top-0 z-20 bg-white">
        <div className="border-b border-black">
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between">
            <div className="flex items-end gap-2">
              <a href="/feed" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Feed</a>
              <a href="/spotlight" className={`px-14 py-2 border border-black -mb-px text-sm ${'bg-black text-white'} transition-transform duration-150 active:translate-y-[1px]`}>Spotlight</a>
              <a href="/subgroup" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Subgroup</a>
              <a href="/profile" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Profile</a>
            </div>
            <div className="flex items-center gap-4 pb-2">
              <span className="text-xs leading-6 text-black"><Identity /></span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-black"></div>
      {/* per request, remove create button from non-feed tabs */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Spotlight</h1>
          <Link href="/spotlight/create" className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white font-['Space_Mono'] text-sm">Create spotlight</Link>
        </div>

        {spotlights.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black">No spotlights yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spotlights.map(sp => (
              <div key={sp.id} className="border border-black p-3 bg-white">
                <h2 className="text-lg font-bold text-black mb-2">{sp.title}</h2>
                {sp.blurb && <p className="text-sm text-gray-700 mb-3">{sp.blurb}</p>}
                <div className="grid grid-cols-2 gap-2 aspect-square">
                  {(sp.items || []).slice(0,4).map(it => (
                    <img key={it.id} src={it.url} alt={it.caption} className="w-full h-full object-cover" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} />
    </div>
  )
}


