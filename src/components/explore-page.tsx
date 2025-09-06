'use client'

import { useEffect, useMemo, useState } from 'react'
import SiteHeader from './SiteHeader'

interface Niche { id: string; label: string; cover: string; items: number }

const initialNiches: Niche[] = [
  { id: 'music', label: 'Music', cover: '/image.png', items: 128 },
  { id: 'image', label: 'Image', cover: '/warmvibes.png', items: 86 },
  { id: 'video', label: 'Video', cover: '/bmw.png', items: 64 },
  { id: 'design', label: 'Design', cover: '/motorcycleguy.png', items: 45 },
  { id: 'portrait', label: 'Portrait', cover: '/warmvibes.png', items: 22 },
  { id: 'typography', label: 'Typography', cover: '/image.png', items: 18 },
]

import { useRouter } from 'next/navigation'

export default function ExplorePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [niches, setNiches] = useState<Niche[]>(initialNiches)
  // no inline create field; use dedicated page

  const filtered = useMemo(() => (
    query.trim()
      ? niches.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
      : niches
  ), [query, niches])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('niche:list')
      if (raw) {
        const saved: Niche[] = JSON.parse(raw)
        // Merge saved with defaults, avoid duplicates by id
        const combined = [...saved, ...initialNiches.filter(d => !saved.find(s => s.id === d.id))]
        setNiches(combined)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subgroups and niches"
            className="w-full max-w-md border border-black px-3 py-2 text-sm text-black"
          />
          <button type="button" onClick={() => router.push('/subgroup/create')} className="px-3 py-2 border border-black text-xs bg-black text-white">Create niche</button>
        </div>

        {/* Grid of niche cards */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(n => (
              <button key={n.id} onClick={() => router.push(`/subgroup/${n.id}`)} className="border border-black text-left bg-white">
                <div className="aspect-square w-full overflow-hidden">
                  <img src={n.cover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <div className="text-sm font-['Space_Mono'] text-black">{n.label}</div>
                  <div className="text-xs text-black">{n.items} items</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}


import { useEffect, useMemo, useState } from 'react'
import SiteHeader from './SiteHeader'

interface Niche { id: string; label: string; cover: string; items: number }

const initialNiches: Niche[] = [
  { id: 'music', label: 'Music', cover: '/image.png', items: 128 },
  { id: 'image', label: 'Image', cover: '/warmvibes.png', items: 86 },
  { id: 'video', label: 'Video', cover: '/bmw.png', items: 64 },
  { id: 'design', label: 'Design', cover: '/motorcycleguy.png', items: 45 },
  { id: 'portrait', label: 'Portrait', cover: '/warmvibes.png', items: 22 },
  { id: 'typography', label: 'Typography', cover: '/image.png', items: 18 },
]

import { useRouter } from 'next/navigation'

export default function ExplorePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [niches, setNiches] = useState<Niche[]>(initialNiches)
  // no inline create field; use dedicated page

  const filtered = useMemo(() => (
    query.trim()
      ? niches.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
      : niches
  ), [query, niches])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('niche:list')
      if (raw) {
        const saved: Niche[] = JSON.parse(raw)
        // Merge saved with defaults, avoid duplicates by id
        const combined = [...saved, ...initialNiches.filter(d => !saved.find(s => s.id === d.id))]
        setNiches(combined)
      }
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subgroups and niches"
            className="w-full max-w-md border border-black px-3 py-2 text-sm text-black"
          />
          <button type="button" onClick={() => router.push('/subgroup/create')} className="px-3 py-2 border border-black text-xs bg-black text-white">Create niche</button>
        </div>

        {/* Grid of niche cards */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(n => (
              <button key={n.id} onClick={() => router.push(`/subgroup/${n.id}`)} className="border border-black text-left bg-white">
                <div className="aspect-square w-full overflow-hidden">
                  <img src={n.cover} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <div className="text-sm font-['Space_Mono'] text-black">{n.label}</div>
                  <div className="text-xs text-black">{n.items} items</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

