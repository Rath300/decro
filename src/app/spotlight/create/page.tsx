'use client'

import { usePosts } from '@/context/post-context'
import { useRef, useState } from 'react'

export default function CreateSpotlight() {
  const { posts } = usePosts()
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<{ id: string; url: string; caption: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const addUpload = (file: File) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const url = URL.createObjectURL(file)
    setUploads(prev => [...prev, { id, url, caption: '' }])
  }
  const save = () => {
    if (!title.trim()) return alert('Title required')
    const chosen = posts.filter(p => selectedIds.has(p.id)).map(p => ({ id: p.id, url: p.imageUrl, caption: '' }))
    const rec = { id: `sp-${Date.now()}`, title, blurb, items: [...chosen, ...uploads] }
    try {
      const raw = localStorage.getItem('spotlights')
      const arr = raw ? JSON.parse(raw) : []
      arr.unshift(rec)
      localStorage.setItem('spotlights', JSON.stringify(arr))
      history.back()
    } catch {}
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      {/* Tabs strip (Spotlight active) */}
      <div className="sticky top-0 z-20 bg-white">
        <div className="border-b border-black">
          <div className="max-w-7xl mx-auto px-4 flex items-end justify-between">
            <div className="flex items-end gap-2">
              <a href="/feed" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Feed</a>
              <a href="/spotlight" className={`px-14 py-2 border border-black -mb-px text-sm bg-black text-white transition-transform duration-150 active:translate-y-[1px]`}>Spotlight</a>
              <a href="/subgroup" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Subgroup</a>
              <a href="/profile" className="px-14 py-2 border border-black border-b-0 -mb-px text-sm bg-white text-black hover:bg-gray-50 transition-transform duration-150 active:translate-y-[1px]">Profile</a>
            </div>
            <div className="flex items-center gap-4 pb-2">
              <a href="/create" className="inline-flex items-center justify-center w-8 h-8 bg-black text-white border border-black">+</a>
              <a href="/" className="text-sm underline">Sign In</a>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px bg-black"></div>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-black mb-4">Create Spotlight</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-sm text-black mb-2">Pick posts</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {posts.map(p => (
                <button key={p.id} onClick={() => toggle(p.id)} className={`border ${selectedIds.has(p.id)?'border-black':'border-gray-300'} p-1`}> 
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-black mb-1">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2 border border-gray-300 text-sm mb-3 text-black" />
            <label className="block text-sm text-black mb-1">Blurb</label>
            <textarea value={blurb} onChange={e=>setBlurb(e.target.value)} rows={4} className="w-full p-2 border border-gray-300 text-sm mb-3 text-black" />
            <label className="block text-sm text-black mb-2">Add images</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={(e)=>{ const f=e.target.files?.[0]; if (f) addUpload(f) }} />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {uploads.map(u => (
                <div key={u.id} className="border border-gray-300 p-1">
                  <img src={u.url} alt="upload" className="w-full h-20 object-cover" />
                  <input value={u.caption} onChange={(e)=>setUploads(prev=>prev.map(x=>x.id===u.id?{...x,caption:e.target.value}:x))} placeholder="Caption" className="w-full p-1 border border-gray-200 text-xs mt-1 text-black" />
                </div>
              ))}
            </div>
            <button onClick={save} className="mt-4 px-3 py-1 border border-black text-black hover:bg-black hover:text-white text-sm">Save spotlight</button>
          </div>
        </div>
      </main>
    </div>
  )
}


