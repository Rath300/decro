'use client'

import { useRouter } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'
import { useState, useRef } from 'react'

export default function CreateNichePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Enforce unique names locally
    try {
      const raw = localStorage.getItem('niche:list')
      const existing = raw ? (JSON.parse(raw) as { id: string; label: string }[]) : []
      if (existing.find(n => n.id === id)) {
        alert('A niche with this name already exists.')
        return
      }
      const coverUrl = previewUrl || '/image.png'
      const updated = [{ id, label: name, cover: coverUrl, items: 0 }, ...existing]
      localStorage.setItem('niche:list', JSON.stringify(updated))
    } catch {}
    // Mock: save to local storage
    try { localStorage.setItem(`niche:${id}:desc`, description) } catch {}
    router.push(`/subgroup/${id}`)
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">Create a niche</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-black mb-2">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 border border-black text-black" placeholder="e.g., Portrait" />
          </div>
          <div>
            <label className="block text-sm text-black mb-2">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 border border-black text-black" rows={4} placeholder="What is this niche about?" />
          </div>
          <div>
            <label className="block text-sm text-black mb-2">Cover image (optional)</label>
            <div className="border-2 border-dashed border-gray-300 p-4 text-center">
              {!previewUrl ? (
                <button type="button" onClick={()=>fileRef.current?.click()} className="px-3 py-2 bg-black text-white border border-black text-xs">Upload image</button>
              ) : (
                <div>
                  <img src={previewUrl} alt="preview" className="mx-auto max-h-48" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const file = e.target.files?.[0]
                if (file) {
                  setCover(file)
                  setPreviewUrl(URL.createObjectURL(file))
                }
              }} />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-black text-white border border-black">Create</button>
        </form>
      </main>
    </div>
  )
}


import { useRouter } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'
import { useState, useRef } from 'react'

export default function CreateNichePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Enforce unique names locally
    try {
      const raw = localStorage.getItem('niche:list')
      const existing = raw ? (JSON.parse(raw) as { id: string; label: string }[]) : []
      if (existing.find(n => n.id === id)) {
        alert('A niche with this name already exists.')
        return
      }
      const coverUrl = previewUrl || '/image.png'
      const updated = [{ id, label: name, cover: coverUrl, items: 0 }, ...existing]
      localStorage.setItem('niche:list', JSON.stringify(updated))
    } catch {}
    // Mock: save to local storage
    try { localStorage.setItem(`niche:${id}:desc`, description) } catch {}
    router.push(`/subgroup/${id}`)
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="explore" />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-4">Create a niche</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-black mb-2">Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full p-3 border border-black text-black" placeholder="e.g., Portrait" />
          </div>
          <div>
            <label className="block text-sm text-black mb-2">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full p-3 border border-black text-black" rows={4} placeholder="What is this niche about?" />
          </div>
          <div>
            <label className="block text-sm text-black mb-2">Cover image (optional)</label>
            <div className="border-2 border-dashed border-gray-300 p-4 text-center">
              {!previewUrl ? (
                <button type="button" onClick={()=>fileRef.current?.click()} className="px-3 py-2 bg-black text-white border border-black text-xs">Upload image</button>
              ) : (
                <div>
                  <img src={previewUrl} alt="preview" className="mx-auto max-h-48" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const file = e.target.files?.[0]
                if (file) {
                  setCover(file)
                  setPreviewUrl(URL.createObjectURL(file))
                }
              }} />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-black text-white border border-black">Create</button>
        </form>
      </main>
    </div>
  )
}

