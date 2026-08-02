'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import type { PitchGraphLink, PitchGraphNode } from '@/app/api/pitch/graph/route'
import { PITCH_BODY, PITCH_ENTER_CTA } from '@/lib/pitch-copy'
import PitchWeb from '@/components/pitch/PitchWeb'
import PitchUploadSheet from '@/components/pitch/PitchUploadSheet'

const ENTERED_KEY = 'decro_pitch_entered'

export default function PitchHome() {
  const [entered, setEntered] = useState(false)
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<PitchGraphNode[]>([])
  const [links, setLinks] = useState<PitchGraphLink[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PitchGraphNode | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    try {
      setEntered(sessionStorage.getItem(ENTERED_KEY) === '1')
    } catch {
      setEntered(false)
    }
    setReady(true)
  }, [])

  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/pitch/graph', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load graph')
      setNodes(data.nodes || [])
      setLinks(data.links || [])
      setLoadError('')
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the web')
    }
  }, [])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  useEffect(() => {
    const onOpen = () => setUploadOpen(true)
    const onOverlay = () => setEntered(false)
    window.addEventListener('pitch:open-upload', onOpen)
    window.addEventListener('pitch:show-overlay', onOverlay)
    return () => {
      window.removeEventListener('pitch:open-upload', onOpen)
      window.removeEventListener('pitch:show-overlay', onOverlay)
    }
  }, [])

  const enter = () => {
    try {
      sessionStorage.setItem(ENTERED_KEY, '1')
    } catch {}
    setEntered(true)
  }

  const onCreated = async (postId: string) => {
    await loadGraph()
    setHighlightPostId(postId)
  }

  if (!ready) {
    return <div className="min-h-[100dvh] bg-white" />
  }

  return (
    <div className="relative bg-white">
      <PitchWeb
        nodes={nodes}
        links={links}
        highlightPostId={highlightPostId}
        onUploadClick={() => setUploadOpen(true)}
        onNodeSelect={setSelected}
      />

      {loadError && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm border border-black bg-white px-3 py-2 text-xs font-['Space_Mono'] z-20">
          {loadError}
        </div>
      )}

      {selected?.kind === 'post' && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 border border-black bg-white z-20 font-['Space_Mono']">
          {selected.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt=""
              className="w-full max-h-56 object-cover border-b border-black"
            />
          )}
          <div className="p-3 space-y-2">
            <p className="text-[10px] uppercase text-black/50">
              {selected.contentType || 'post'}
            </p>
            <h3 className="text-sm font-bold">{selected.label}</h3>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selected?.kind === 'subgroup' && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 border border-black bg-white z-20 p-3 font-['Space_Mono']">
          <p className="text-[10px] uppercase text-black/50">Group</p>
          <h3 className="text-sm font-bold uppercase mt-1">{selected.label}</h3>
          <button
            type="button"
            className="mt-3 text-xs border border-black px-3 py-1.5 uppercase hover:bg-black hover:text-white"
            onClick={() => setUploadOpen(true)}
          >
            Upload here
          </button>
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={() => setSelected(null)}
          >
            Close
          </button>
        </div>
      )}

      {!entered && (
        <div className="fixed inset-0 z-[70] bg-white/92 flex items-center justify-center px-6">
          <div className="max-w-xl w-full">
            <Image
              src="/decky.png"
              alt="Decro"
              width={112}
              height={112}
              className="w-24 h-24 sm:w-28 sm:h-28"
              priority
            />
            <p className="mt-6 text-sm sm:text-base font-['Space_Mono'] text-black/80 leading-relaxed max-w-md">
              {PITCH_BODY}
            </p>
            <button
              type="button"
              onClick={enter}
              className="mt-8 border border-black bg-black text-white px-6 py-3 text-sm font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
            >
              {PITCH_ENTER_CTA}
            </button>
          </div>
        </div>
      )}

      <PitchUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onCreated={onCreated}
        preferredGroup={
          selected?.kind === 'subgroup' && selected.subgroupId
            ? {
                id: selected.subgroupId,
                name: selected.label,
                slug: selected.slug || '',
              }
            : null
        }
      />
    </div>
  )
}
