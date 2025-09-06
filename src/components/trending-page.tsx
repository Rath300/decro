'use client'

import { useMemo, useState } from 'react'
import SiteHeader from './SiteHeader'

type MediaKind = 'MUSIC' | 'IMAGE' | 'VIDEO' | 'FILM' | 'EDITS' | 'DESIGN' | 'PHYSICAL'

interface Row {
  id: string
  title: string
  creator: string
  type: MediaKind
  image: string
  score: number
  views: string
}

const items: Row[] = [
  { id: '1', title: 'Synth Experiment #1', creator: 'Joshua K', type: 'MUSIC', image: '/image.png', score: 109, views: '694.6K' },
  { id: '2', title: 'Warm Vibes – Photo', creator: 'Curated', type: 'IMAGE', image: '/warmvibes.png', score: 101, views: '530.2K' },
  { id: '3', title: 'Pool Reflections', creator: 'Short Film', type: 'FILM', image: '/bmw.png', score: 96, views: '497.1K' },
  { id: '4', title: 'Urban Rider', creator: 'Street', type: 'PHYSICAL', image: '/motorcycleguy.png', score: 88, views: '446.4K' },
  { id: '5', title: 'Neon Cut', creator: 'Edit Lab', type: 'EDITS', image: '/image.png', score: 72, views: '365.6K' },
  { id: '6', title: 'Title Card Series', creator: 'Studio G', type: 'DESIGN', image: '/image.png', score: 69, views: '391.2K' },
]

type FilterKind = 'ALL' | MediaKind
const filterOptions: FilterKind[] = ['ALL', 'MUSIC', 'IMAGE', 'VIDEO', 'FILM', 'EDITS', 'DESIGN', 'PHYSICAL']

function TypeIcon({ type }: { type: FilterKind }) {
  if (type === 'ALL') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="1" width="4" height="4" stroke="black" />
        <rect x="7" y="1" width="4" height="4" stroke="black" />
        <rect x="1" y="7" width="4" height="4" stroke="black" />
        <rect x="7" y="7" width="4" height="4" stroke="black" />
      </svg>
    )
  }
  if (type === 'MUSIC') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <path d="M4 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="black" />
        <path d="M5.5 8V2.5l4-1V6" stroke="black" />
      </svg>
    )
  }
  if (type === 'IMAGE' || type === 'DESIGN' || type === 'PHYSICAL') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="2" width="10" height="8" stroke="black" />
        <path d="M3 8l2-2 2 2 2-3 2 3" stroke="black" />
      </svg>
    )
  }
  if (type === 'VIDEO' || type === 'FILM') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="2" width="7" height="8" stroke="black" />
        <path d="M9 4l2-1v6l-2-1V4Z" stroke="black" />
      </svg>
    )
  }
  if (type === 'EDITS') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <path d="M2 10h8" stroke="black" />
        <path d="M3 8l5-5 1 1-5 5H3Z" stroke="black" />
      </svg>
    )
  }
  return null
}

export default function TrendingPage() {
  const [active, setActive] = useState<FilterKind>('ALL')
  const filtered = useMemo(() => (active === 'ALL' ? items : items.filter(i => i.type === active)), [active])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="trending" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-4xl sm:text-6xl font-['Space_Mono'] font-bold mb-6 text-black">CHARTS</h2>
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {filterOptions.map((f) => (
              <button
                key={f}
                aria-pressed={active === f}
                onClick={() => setActive(f)}
                className={`inline-flex items-center px-3 py-1 border border-black text-xs font-['Space_Mono'] text-black whitespace-nowrap ${active === f ? 'underline' : ''}`}
              >
                <TypeIcon type={f} />{f}
              </button>
            ))}
          </div>
          <button className="px-3 py-2 border border-black text-xs font-['Space_Mono'] text-black">ALL MEDIA / ALL GENRES / TODAY ▾</button>
        </div>
        <div className="divide-y divide-gray-200 border-t border-b">
          {filtered.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px_90px] items-center gap-4 py-4">
              <div className="text-xl font-['Space_Mono'] text-black">{idx + 1}</div>
              <div className="flex items-center gap-3 min-w-0">
                <img src={row.image} alt="thumb" className="w-12 h-12 object-cover" />
                <div className="min-w-0">
                  <div className="text-lg font-['Space_Mono'] truncate text-black">{row.title}</div>
                  <div className="text-xs text-black">{row.type}</div>
                </div>
              </div>
              <div className="font-['Space_Mono'] truncate text-black">{row.creator}</div>
              <div className="font-['Space_Mono'] text-sm text-black">{row.score}</div>
              <div className="font-['Space_Mono'] text-sm text-black">{row.views}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}


import { useMemo, useState } from 'react'
import SiteHeader from './SiteHeader'

type MediaKind = 'MUSIC' | 'IMAGE' | 'VIDEO' | 'FILM' | 'EDITS' | 'DESIGN' | 'PHYSICAL'

interface Row {
  id: string
  title: string
  creator: string
  type: MediaKind
  image: string
  score: number
  views: string
}

const items: Row[] = [
  { id: '1', title: 'Synth Experiment #1', creator: 'Joshua K', type: 'MUSIC', image: '/image.png', score: 109, views: '694.6K' },
  { id: '2', title: 'Warm Vibes – Photo', creator: 'Curated', type: 'IMAGE', image: '/warmvibes.png', score: 101, views: '530.2K' },
  { id: '3', title: 'Pool Reflections', creator: 'Short Film', type: 'FILM', image: '/bmw.png', score: 96, views: '497.1K' },
  { id: '4', title: 'Urban Rider', creator: 'Street', type: 'PHYSICAL', image: '/motorcycleguy.png', score: 88, views: '446.4K' },
  { id: '5', title: 'Neon Cut', creator: 'Edit Lab', type: 'EDITS', image: '/image.png', score: 72, views: '365.6K' },
  { id: '6', title: 'Title Card Series', creator: 'Studio G', type: 'DESIGN', image: '/image.png', score: 69, views: '391.2K' },
]

type FilterKind = 'ALL' | MediaKind
const filterOptions: FilterKind[] = ['ALL', 'MUSIC', 'IMAGE', 'VIDEO', 'FILM', 'EDITS', 'DESIGN', 'PHYSICAL']

function TypeIcon({ type }: { type: FilterKind }) {
  if (type === 'ALL') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="1" width="4" height="4" stroke="black" />
        <rect x="7" y="1" width="4" height="4" stroke="black" />
        <rect x="1" y="7" width="4" height="4" stroke="black" />
        <rect x="7" y="7" width="4" height="4" stroke="black" />
      </svg>
    )
  }
  if (type === 'MUSIC') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <path d="M4 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="black" />
        <path d="M5.5 8V2.5l4-1V6" stroke="black" />
      </svg>
    )
  }
  if (type === 'IMAGE' || type === 'DESIGN' || type === 'PHYSICAL') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="2" width="10" height="8" stroke="black" />
        <path d="M3 8l2-2 2 2 2-3 2 3" stroke="black" />
      </svg>
    )
  }
  if (type === 'VIDEO' || type === 'FILM') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <rect x="1" y="2" width="7" height="8" stroke="black" />
        <path d="M9 4l2-1v6l-2-1V4Z" stroke="black" />
      </svg>
    )
  }
  if (type === 'EDITS') {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
        <path d="M2 10h8" stroke="black" />
        <path d="M3 8l5-5 1 1-5 5H3Z" stroke="black" />
      </svg>
    )
  }
  return null
}

export default function TrendingPage() {
  const [active, setActive] = useState<FilterKind>('ALL')
  const filtered = useMemo(() => (active === 'ALL' ? items : items.filter(i => i.type === active)), [active])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="trending" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-4xl sm:text-6xl font-['Space_Mono'] font-bold mb-6 text-black">CHARTS</h2>
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex flex-wrap gap-2 overflow-x-auto">
            {filterOptions.map((f) => (
              <button
                key={f}
                aria-pressed={active === f}
                onClick={() => setActive(f)}
                className={`inline-flex items-center px-3 py-1 border border-black text-xs font-['Space_Mono'] text-black whitespace-nowrap ${active === f ? 'underline' : ''}`}
              >
                <TypeIcon type={f} />{f}
              </button>
            ))}
          </div>
          <button className="px-3 py-2 border border-black text-xs font-['Space_Mono'] text-black">ALL MEDIA / ALL GENRES / TODAY ▾</button>
        </div>
        <div className="divide-y divide-gray-200 border-t border-b">
          {filtered.map((row, idx) => (
            <div key={row.id} className="grid grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)_80px_90px] items-center gap-4 py-4">
              <div className="text-xl font-['Space_Mono'] text-black">{idx + 1}</div>
              <div className="flex items-center gap-3 min-w-0">
                <img src={row.image} alt="thumb" className="w-12 h-12 object-cover" />
                <div className="min-w-0">
                  <div className="text-lg font-['Space_Mono'] truncate text-black">{row.title}</div>
                  <div className="text-xs text-black">{row.type}</div>
                </div>
              </div>
              <div className="font-['Space_Mono'] truncate text-black">{row.creator}</div>
              <div className="font-['Space_Mono'] text-sm text-black">{row.score}</div>
              <div className="font-['Space_Mono'] text-sm text-black">{row.views}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

