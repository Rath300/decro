'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteHeader from './SiteHeader'

interface Annotation {
  id: string
  start: number
  end: number
  text: string
  author: string
}

const initialText = `Read All The Lyrics To Sabrina Carpenter’s New Album ‘Man’s Best Friend’. It follows last year’s ‘Short n’ Sweet.’ Select any portion to annotate.`

export default function SpotlightPage() {
  const router = useRouter()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [draft, setDraft] = useState('')

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const start = range.startOffset
    const end = range.endOffset
    if (start !== end) setSelection({ start, end })
  }

  const addAnnotation = () => {
    if (!selection || !draft.trim()) return
    setAnnotations(prev => [
      ...prev,
      { id: String(prev.length + 1), start: selection.start, end: selection.end, text: draft.trim(), author: 'anon' }
    ])
    setDraft('')
    setSelection(null)
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="spotlight" />

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Article */}
        <section className="lg:col-span-2">
          <h2 className="text-4xl font-['Space_Mono'] font-bold mb-2 max-w-2xl">
            Read All The Lyrics To Sabrina Carpenter’s New Album ‘Man’s Best Friend’
          </h2>
          <p className="text-sm text-gray-700 font-['Space_Mono'] mb-6">It follows last year’s ‘Short n’ Sweet.’</p>
          <div
            className="p-4 border border-black leading-7 text-[15px] text-black select-text bg-white"
            onMouseUp={handleMouseUp}
          >
            {initialText.split('').map((ch, idx) => {
              const ann = annotations.find(a => idx >= a.start && idx < a.end)
              return (
                <span key={idx} className={ann ? 'bg-yellow-200' : undefined}>{ch}</span>
              )
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="border border-black p-4 bg-white">
            <h3 className="text-sm font-['Space_Mono'] font-medium mb-2">Add annotation</h3>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={selection ? 'Write your note…' : 'Select text in the article first'}
              className="w-full h-24 p-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              onClick={addAnnotation}
              disabled={!selection || !draft.trim()}
              className={`mt-2 w-full py-2 border border-black text-sm font-['Space_Mono'] ${(!selection || !draft.trim()) ? 'bg-gray-200 text-gray-500' : 'bg-black text-white hover:bg-gray-800'} transition`}
            >
              Save Annotation
            </button>
          </div>

          <div className="border border-black p-4 bg-white">
            <h3 className="text-sm font-['Space_Mono'] font-medium mb-3">All annotations</h3>
            <div className="space-y-3">
              {annotations.length === 0 && (
                <div className="text-xs text-gray-600">No annotations yet.</div>
              )}
              {annotations.map(a => (
                <div key={a.id} className="text-sm">
                  <div className="font-medium">Range {a.start}–{a.end}</div>
                  <div className="text-gray-700">{a.text}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}


import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteHeader from './SiteHeader'

interface Annotation {
  id: string
  start: number
  end: number
  text: string
  author: string
}

const initialText = `Read All The Lyrics To Sabrina Carpenter’s New Album ‘Man’s Best Friend’. It follows last year’s ‘Short n’ Sweet.’ Select any portion to annotate.`

export default function SpotlightPage() {
  const router = useRouter()
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null)
  const [draft, setDraft] = useState('')

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    const start = range.startOffset
    const end = range.endOffset
    if (start !== end) setSelection({ start, end })
  }

  const addAnnotation = () => {
    if (!selection || !draft.trim()) return
    setAnnotations(prev => [
      ...prev,
      { id: String(prev.length + 1), start: selection.start, end: selection.end, text: draft.trim(), author: 'anon' }
    ])
    setDraft('')
    setSelection(null)
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="spotlight" />

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Article */}
        <section className="lg:col-span-2">
          <h2 className="text-4xl font-['Space_Mono'] font-bold mb-2 max-w-2xl">
            Read All The Lyrics To Sabrina Carpenter’s New Album ‘Man’s Best Friend’
          </h2>
          <p className="text-sm text-gray-700 font-['Space_Mono'] mb-6">It follows last year’s ‘Short n’ Sweet.’</p>
          <div
            className="p-4 border border-black leading-7 text-[15px] text-black select-text bg-white"
            onMouseUp={handleMouseUp}
          >
            {initialText.split('').map((ch, idx) => {
              const ann = annotations.find(a => idx >= a.start && idx < a.end)
              return (
                <span key={idx} className={ann ? 'bg-yellow-200' : undefined}>{ch}</span>
              )
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="border border-black p-4 bg-white">
            <h3 className="text-sm font-['Space_Mono'] font-medium mb-2">Add annotation</h3>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={selection ? 'Write your note…' : 'Select text in the article first'}
              className="w-full h-24 p-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            />
            <button
              onClick={addAnnotation}
              disabled={!selection || !draft.trim()}
              className={`mt-2 w-full py-2 border border-black text-sm font-['Space_Mono'] ${(!selection || !draft.trim()) ? 'bg-gray-200 text-gray-500' : 'bg-black text-white hover:bg-gray-800'} transition`}
            >
              Save Annotation
            </button>
          </div>

          <div className="border border-black p-4 bg-white">
            <h3 className="text-sm font-['Space_Mono'] font-medium mb-3">All annotations</h3>
            <div className="space-y-3">
              {annotations.length === 0 && (
                <div className="text-xs text-gray-600">No annotations yet.</div>
              )}
              {annotations.map(a => (
                <div key={a.id} className="text-sm">
                  <div className="font-medium">Range {a.start}–{a.end}</div>
                  <div className="text-gray-700">{a.text}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

