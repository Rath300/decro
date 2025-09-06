'use client'

import { useState } from 'react'
import SiteHeader from './SiteHeader'

type MediaType = 'image' | 'music' | 'video'

interface CollageItem { id: string; imageUrl: string; type: MediaType }
interface CuratedList {
  id: string
  title: string
  curator: string
  blurb: string
  collage: CollageItem[]
  date: string
}

function readSavedSpotlights(): CuratedList[] {
  try {
    const raw = localStorage.getItem('spotlights')
    if (!raw) return []
    const arr = JSON.parse(raw) as { id: string; title: string; blurb: string; items: { id: string; url: string }[] }[]
    return arr.map((s) => ({ id: s.id, title: s.title, curator: 'You', blurb: s.blurb, date: 'Saved', collage: s.items.map(i => ({ id: i.id, imageUrl: i.url, type: 'image' as const })) }))
  } catch { return [] }
}

const curated: CuratedList[] = [
  {
    id: 'trending',
    title: 'Most Trending — This Week',
    curator: 'Editors',
    blurb: 'A rolling collage of the pieces everyone is talking about.',
    date: 'This Week',
    collage: [
      { id: 'c1', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'c2', imageUrl: '/bmw.png', type: 'video' },
      { id: 'c3', imageUrl: '/motorcycleguy.png', type: 'image' },
      { id: 'c4', imageUrl: '/image.png', type: 'music' },
    ],
  },
  {
    id: 'color-study',
    title: 'Color Studies in Motion',
    curator: 'Curated by Film Club',
    blurb: 'Saturated frames, slow pans, and stills that feel like paintings.',
    date: 'Updated Daily',
    collage: [
      { id: 'd1', imageUrl: '/bmw.png', type: 'video' },
      { id: 'd2', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'd3', imageUrl: '/image.png', type: 'music' },
      { id: 'd4', imageUrl: '/motorcycleguy.png', type: 'image' },
    ],
  },
  {
    id: 'street-and-silhouette',
    title: 'Street + Silhouette',
    curator: 'Guest Editor',
    blurb: 'High contrast, concrete textures, and motion blur.',
    date: 'Aug 2025',
    collage: [
      { id: 'e1', imageUrl: '/motorcycleguy.png', type: 'image' },
      { id: 'e2', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'e3', imageUrl: '/image.png', type: 'music' },
      { id: 'e4', imageUrl: '/bmw.png', type: 'video' },
    ],
  },
]

interface Annotation { id: string; text: string }

function CollageMosaic({ images }: { images: { id: string; imageUrl: string }[] }) {
  const list = images.length ? images : [{ id: 'ph1', imageUrl: '/image.png' }]
  return (
    <div className="w-full border border-black overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {list.map((c) => (
          <div key={c.id} className="relative aspect-square">
            <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnotatorModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: SpotlightItem | null }) {
  const [notes, setNotes] = useState<Annotation[]>([])
  const [draft, setDraft] = useState('')

  if (!open || !item) return null

  const addNote = () => {
    if (!draft.trim()) return
    setNotes(prev => [...prev, { id: String(prev.length + 1), text: draft.trim() }])
    setDraft('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Media */}
        <div className="p-4 border-r border-gray-200">
          <div className="mb-3">
            <h3 className="text-xl font-['Space_Mono'] font-bold">{item.title}</h3>
            <p className="text-sm text-gray-600 font-['Space_Mono']">{item.author} • {item.date}</p>
          </div>
          {item.type === 'image' && (
            <img src={item.imageUrl} alt={item.title} className="w-full h-auto" />
          )}
          {item.type === 'video' && (
            <video src={item.mediaUrl} controls className="w-full h-auto" />
          )}
          {item.type === 'music' && (
            <div>
              <img src={item.imageUrl} alt={item.title} className="w-full h-auto mb-3" />
              <audio controls className="w-full">
                <source src={item.mediaUrl} />
              </audio>
            </div>
          )}
        </div>

        {/* Annotations */}
        <div className="p-4 flex flex-col">
          <div className="mb-3">
            <h4 className="text-sm font-['Space_Mono'] font-medium">Notes</h4>
            <p className="text-xs text-gray-600 font-['Space_Mono']">Add short blurbs, references, or context—Genius-style.</p>
          </div>
          <div className="flex-1 overflow-auto space-y-3 border border-gray-200 p-3 bg-white">
            {notes.length === 0 && (
              <div className="text-xs text-gray-500">No notes yet.</div>
            )}
            {notes.map(n => (
              <div key={n.id} className="text-sm font-['Space_Mono']">• {n.text}</div>
            ))}
          </div>
          <div className="mt-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a blurb…" className="w-full h-20 p-2 border border-black text-sm font-['Space_Mono']" />
            <div className="mt-2 flex gap-2">
              <button onClick={addNote} className="px-3 py-2 bg-black text-white text-sm font-['Space_Mono']">Add Note</button>
              <button onClick={onClose} className="px-3 py-2 border border-black text-sm font-['Space_Mono']">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SpotlightPage() {
  const [open, setOpen] = useState(false)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const saved = readSavedSpotlights()

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="spotlight" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Featured large collage */}
        {curated.slice(0,1).map((list) => (
          <section key={list.id} className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div>
              <div className="text-xs tracking-widest text-gray-600 mb-2">CURATED LIST</div>
              <h2 className="text-2xl sm:text-3xl font-['Space_Mono'] font-bold mb-2 leading-tight text-black">{list.title}</h2>
              <p className="text-sm sm:text-base text-black mb-2">{list.blurb}</p>
              <div className="text-xs text-black mb-4">by {list.curator} / {list.date}</div>
              <button onClick={() => { setActiveTitle(list.title); setOpen(true) }} className="px-3 py-2 bg-black text-white border border-black text-xs">Open List</button>
              <button onClick={() => location.assign('/spotlight/create')} className="ml-2 px-3 py-2 border border-black text-xs text-black">Create spotlight</button>
            </div>
            <div className="lg:col-span-2"><CollageMosaic images={list.collage} /></div>
          </section>
        ))}

        {/* Stacked multi-lists below (open layout) */}
        <div className="space-y-8">
          {[...saved, ...curated.slice(1)].map((list) => (
            <section key={list.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-xs tracking-widest text-gray-600 mb-2">CURATED LIST</div>
                <button onClick={() => { setActiveTitle(list.title); setOpen(true) }} className="text-2xl font-['Space_Mono'] font-bold text-left underline decoration-black/90 text-black">
                  {list.title}
                </button>
                <div className="text-sm text-black mt-2">{list.blurb}</div>
                <div className="text-xs text-black mt-2">by {list.curator} / {list.date}</div>
              </div>
              <div className="md:col-span-2">
                <CollageMosaic images={list.collage} />
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Reuse annotator shell as a simple modal for now */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl p-6 border border-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-['Space_Mono'] font-bold text-black">{activeTitle}</h3>
              <button onClick={() => setOpen(false)} className="text-sm border border-black px-2 py-1">Close</button>
            </div>
            <p className="text-sm text-gray-700">Open this list to browse every included piece with the same card layout as the feed.</p>
          </div>
        </div>
      )}
    </div>
  )
}


import { useState } from 'react'
import SiteHeader from './SiteHeader'

type MediaType = 'image' | 'music' | 'video'

interface CollageItem { id: string; imageUrl: string; type: MediaType }
interface CuratedList {
  id: string
  title: string
  curator: string
  blurb: string
  collage: CollageItem[]
  date: string
}

function readSavedSpotlights(): CuratedList[] {
  try {
    const raw = localStorage.getItem('spotlights')
    if (!raw) return []
    const arr = JSON.parse(raw) as { id: string; title: string; blurb: string; items: { id: string; url: string }[] }[]
    return arr.map((s) => ({ id: s.id, title: s.title, curator: 'You', blurb: s.blurb, date: 'Saved', collage: s.items.map(i => ({ id: i.id, imageUrl: i.url, type: 'image' as const })) }))
  } catch { return [] }
}

const curated: CuratedList[] = [
  {
    id: 'trending',
    title: 'Most Trending — This Week',
    curator: 'Editors',
    blurb: 'A rolling collage of the pieces everyone is talking about.',
    date: 'This Week',
    collage: [
      { id: 'c1', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'c2', imageUrl: '/bmw.png', type: 'video' },
      { id: 'c3', imageUrl: '/motorcycleguy.png', type: 'image' },
      { id: 'c4', imageUrl: '/image.png', type: 'music' },
    ],
  },
  {
    id: 'color-study',
    title: 'Color Studies in Motion',
    curator: 'Curated by Film Club',
    blurb: 'Saturated frames, slow pans, and stills that feel like paintings.',
    date: 'Updated Daily',
    collage: [
      { id: 'd1', imageUrl: '/bmw.png', type: 'video' },
      { id: 'd2', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'd3', imageUrl: '/image.png', type: 'music' },
      { id: 'd4', imageUrl: '/motorcycleguy.png', type: 'image' },
    ],
  },
  {
    id: 'street-and-silhouette',
    title: 'Street + Silhouette',
    curator: 'Guest Editor',
    blurb: 'High contrast, concrete textures, and motion blur.',
    date: 'Aug 2025',
    collage: [
      { id: 'e1', imageUrl: '/motorcycleguy.png', type: 'image' },
      { id: 'e2', imageUrl: '/warmvibes.png', type: 'image' },
      { id: 'e3', imageUrl: '/image.png', type: 'music' },
      { id: 'e4', imageUrl: '/bmw.png', type: 'video' },
    ],
  },
]

interface Annotation { id: string; text: string }

function CollageMosaic({ images }: { images: { id: string; imageUrl: string }[] }) {
  const list = images.length ? images : [{ id: 'ph1', imageUrl: '/image.png' }]
  return (
    <div className="w-full border border-black overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {list.map((c) => (
          <div key={c.id} className="relative aspect-square">
            <img src={c.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnotatorModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: SpotlightItem | null }) {
  const [notes, setNotes] = useState<Annotation[]>([])
  const [draft, setDraft] = useState('')

  if (!open || !item) return null

  const addNote = () => {
    if (!draft.trim()) return
    setNotes(prev => [...prev, { id: String(prev.length + 1), text: draft.trim() }])
    setDraft('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        {/* Media */}
        <div className="p-4 border-r border-gray-200">
          <div className="mb-3">
            <h3 className="text-xl font-['Space_Mono'] font-bold">{item.title}</h3>
            <p className="text-sm text-gray-600 font-['Space_Mono']">{item.author} • {item.date}</p>
          </div>
          {item.type === 'image' && (
            <img src={item.imageUrl} alt={item.title} className="w-full h-auto" />
          )}
          {item.type === 'video' && (
            <video src={item.mediaUrl} controls className="w-full h-auto" />
          )}
          {item.type === 'music' && (
            <div>
              <img src={item.imageUrl} alt={item.title} className="w-full h-auto mb-3" />
              <audio controls className="w-full">
                <source src={item.mediaUrl} />
              </audio>
            </div>
          )}
        </div>

        {/* Annotations */}
        <div className="p-4 flex flex-col">
          <div className="mb-3">
            <h4 className="text-sm font-['Space_Mono'] font-medium">Notes</h4>
            <p className="text-xs text-gray-600 font-['Space_Mono']">Add short blurbs, references, or context—Genius-style.</p>
          </div>
          <div className="flex-1 overflow-auto space-y-3 border border-gray-200 p-3 bg-white">
            {notes.length === 0 && (
              <div className="text-xs text-gray-500">No notes yet.</div>
            )}
            {notes.map(n => (
              <div key={n.id} className="text-sm font-['Space_Mono']">• {n.text}</div>
            ))}
          </div>
          <div className="mt-3">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a blurb…" className="w-full h-20 p-2 border border-black text-sm font-['Space_Mono']" />
            <div className="mt-2 flex gap-2">
              <button onClick={addNote} className="px-3 py-2 bg-black text-white text-sm font-['Space_Mono']">Add Note</button>
              <button onClick={onClose} className="px-3 py-2 border border-black text-sm font-['Space_Mono']">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SpotlightPage() {
  const [open, setOpen] = useState(false)
  const [activeTitle, setActiveTitle] = useState<string | null>(null)
  const saved = readSavedSpotlights()

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="spotlight" />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Featured large collage */}
        {curated.slice(0,1).map((list) => (
          <section key={list.id} className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div>
              <div className="text-xs tracking-widest text-gray-600 mb-2">CURATED LIST</div>
              <h2 className="text-2xl sm:text-3xl font-['Space_Mono'] font-bold mb-2 leading-tight text-black">{list.title}</h2>
              <p className="text-sm sm:text-base text-black mb-2">{list.blurb}</p>
              <div className="text-xs text-black mb-4">by {list.curator} / {list.date}</div>
              <button onClick={() => { setActiveTitle(list.title); setOpen(true) }} className="px-3 py-2 bg-black text-white border border-black text-xs">Open List</button>
              <button onClick={() => location.assign('/spotlight/create')} className="ml-2 px-3 py-2 border border-black text-xs text-black">Create spotlight</button>
            </div>
            <div className="lg:col-span-2"><CollageMosaic images={list.collage} /></div>
          </section>
        ))}

        {/* Stacked multi-lists below (open layout) */}
        <div className="space-y-8">
          {[...saved, ...curated.slice(1)].map((list) => (
            <section key={list.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="text-xs tracking-widest text-gray-600 mb-2">CURATED LIST</div>
                <button onClick={() => { setActiveTitle(list.title); setOpen(true) }} className="text-2xl font-['Space_Mono'] font-bold text-left underline decoration-black/90 text-black">
                  {list.title}
                </button>
                <div className="text-sm text-black mt-2">{list.blurb}</div>
                <div className="text-xs text-black mt-2">by {list.curator} / {list.date}</div>
              </div>
              <div className="md:col-span-2">
                <CollageMosaic images={list.collage} />
              </div>
            </section>
          ))}
        </div>
      </main>

      {/* Reuse annotator shell as a simple modal for now */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl p-6 border border-black">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-['Space_Mono'] font-bold text-black">{activeTitle}</h3>
              <button onClick={() => setOpen(false)} className="text-sm border border-black px-2 py-1">Close</button>
            </div>
            <p className="text-sm text-gray-700">Open this list to browse every included piece with the same card layout as the feed.</p>
          </div>
        </div>
      )}
    </div>
  )
}

