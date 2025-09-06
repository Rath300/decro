'use client'

import { useRef, useState } from 'react'
import SiteHeader from '@/components/SiteHeader'
import { usePosts } from '@/context/post-context'

export default function CreateSpotlightPage() {
  const { posts } = usePosts()
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<{ id: string; url: string; caption: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleSel = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const addUpload = (file: File) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const url = URL.createObjectURL(file)
    setUploads(prev => [...prev, { id, url, caption: '' }])
  }

  const saveSpotlight = () => {
    if (!title.trim()) return alert('Title required')
    const postList = posts.filter(p => selectedIds.has(p.id)).map(p => ({ id: p.id, url: p.imageUrl, caption: '' }))
    const all = [...postList, ...uploads]
    const rec = { id: `sp-${Date.now()}`, title, blurb, items: all }
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
      <SiteHeader active="spotlight" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">Create spotlight</h1>
        <div className="space-y-4 mb-6">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Spotlight title" className="w-full p-3 border border-black text-black" />
          <textarea value={blurb} onChange={e=>setBlurb(e.target.value)} placeholder="Short blurb" rows={3} className="w-full p-3 border border-black text-black" />
        </div>
        <div className="mb-6">
          <button type="button" onClick={()=>fileRef.current?.click()} className="px-3 py-2 border border-black text-xs bg-white text-black">Upload images</button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e)=>{ const files = Array.from(e.target.files||[]); files.forEach(addUpload) }} />
        </div>
        {!!uploads.length && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploads.map(u => (
              <div key={u.id} className="border border-black">
                <div className="aspect-square overflow-hidden"><img src={u.url} alt="" className="w-full h-full object-cover" /></div>
                <input value={u.caption} onChange={e=>setUploads(prev=>prev.map(x=>x.id===u.id?{...x, caption:e.target.value}:x))} placeholder="Caption" className="w-full p-2 text-sm border-t border-black text-black" />
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {posts.map(p => (
            <button type="button" key={p.id} onClick={()=>toggleSel(p.id)} className={`border border-black ${selectedIds.has(p.id)?'ring-2 ring-black':''}`}>
              <div className="aspect-square overflow-hidden">
                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-2 text-xs text-black">{p.title}</div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-black text-white border border-black" onClick={saveSpotlight}>Save (mock)</button>
        </div>
      </main>
    </div>
  )
}


import { useRef, useState } from 'react'
import SiteHeader from '@/components/SiteHeader'
import { usePosts } from '@/context/post-context'

export default function CreateSpotlightPage() {
  const { posts } = usePosts()
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<{ id: string; url: string; caption: string }[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleSel = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const addUpload = (file: File) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const url = URL.createObjectURL(file)
    setUploads(prev => [...prev, { id, url, caption: '' }])
  }

  const saveSpotlight = () => {
    if (!title.trim()) return alert('Title required')
    const postList = posts.filter(p => selectedIds.has(p.id)).map(p => ({ id: p.id, url: p.imageUrl, caption: '' }))
    const all = [...postList, ...uploads]
    const rec = { id: `sp-${Date.now()}`, title, blurb, items: all }
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
      <SiteHeader active="spotlight" />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">Create spotlight</h1>
        <div className="space-y-4 mb-6">
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Spotlight title" className="w-full p-3 border border-black text-black" />
          <textarea value={blurb} onChange={e=>setBlurb(e.target.value)} placeholder="Short blurb" rows={3} className="w-full p-3 border border-black text-black" />
        </div>
        <div className="mb-6">
          <button type="button" onClick={()=>fileRef.current?.click()} className="px-3 py-2 border border-black text-xs bg-white text-black">Upload images</button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e)=>{ const files = Array.from(e.target.files||[]); files.forEach(addUpload) }} />
        </div>
        {!!uploads.length && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uploads.map(u => (
              <div key={u.id} className="border border-black">
                <div className="aspect-square overflow-hidden"><img src={u.url} alt="" className="w-full h-full object-cover" /></div>
                <input value={u.caption} onChange={e=>setUploads(prev=>prev.map(x=>x.id===u.id?{...x, caption:e.target.value}:x))} placeholder="Caption" className="w-full p-2 text-sm border-t border-black text-black" />
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {posts.map(p => (
            <button type="button" key={p.id} onClick={()=>toggleSel(p.id)} className={`border border-black ${selectedIds.has(p.id)?'ring-2 ring-black':''}`}>
              <div className="aspect-square overflow-hidden">
                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="p-2 text-xs text-black">{p.title}</div>
            </button>
          ))}
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-black text-white border border-black" onClick={saveSpotlight}>Save (mock)</button>
        </div>
      </main>
    </div>
  )
}

