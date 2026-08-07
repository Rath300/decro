'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PitchGraphLink, PitchGraphNode } from '@/app/api/pitch/graph/route'
import { getPitchParent } from '@/lib/pitch-taxonomy'
import PitchWeb from '@/components/pitch/PitchWeb'
import PitchOnboarding from '@/components/pitch/PitchOnboarding'
import type {
  OptimisticUpload,
  UploadCommit,
} from '@/components/pitch/PitchUploadSheet'

const ENTERED_KEY = 'decro_pitch_onboarded_v2'

function displayUsername(raw?: string | null) {
  if (!raw || /^anonymous(_|$)/i.test(raw)) return 'anonymous'
  return raw
}

export default function PitchHome() {
  const router = useRouter()
  const [entered, setEntered] = useState(false)
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<PitchGraphNode[]>([])
  const [links, setLinks] = useState<PitchGraphLink[]>([])
  const [expandedParent, setExpandedParent] = useState<string | null>(null)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PitchGraphNode | null>(null)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    try {
      setEntered(sessionStorage.getItem(ENTERED_KEY) === '1')
    } catch {
      setEntered(false)
    }
    setReady(true)
  }, [])

  const loadGraph = useCallback(async (parentId: string | null) => {
    try {
      const qs = parentId ? `?parent=${encodeURIComponent(parentId)}` : ''
      const res = await fetch(`/api/pitch/graph${qs}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load graph')
      setNodes((prev) => {
        const pending = prev.filter((n) => n.pending)
        const pendingIds = new Set(pending.map((n) => n.id))
        const remote = (data.nodes || []) as PitchGraphNode[]
        return [...remote.filter((n) => !pendingIds.has(n.id)), ...pending]
      })
      setLinks((prev) => {
        const pendingLinks = prev.filter(
          (l) =>
            String(l.source).startsWith('p:temp-') ||
            String(l.target).startsWith('g:temp-')
        )
        const remote = (data.links || []) as PitchGraphLink[]
        return [...remote, ...pendingLinks]
      })
      setLoadError('')
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the web')
    }
  }, [])

  useEffect(() => {
    void loadGraph(expandedParent)
  }, [loadGraph, expandedParent])

  useEffect(() => {
    const onOverlay = () => setEntered(false)
    window.addEventListener('pitch:show-overlay', onOverlay)
    return () => window.removeEventListener('pitch:show-overlay', onOverlay)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const enter = () => {
    try {
      sessionStorage.setItem(ENTERED_KEY, '1')
    } catch {}
    setEntered(true)
  }

  const onParentExpand = (parentId: string) => {
    setSelected(null)
    setExpandedParent(parentId)
  }

  const onCollapse = () => {
    setSelected(null)
    setExpandedParent(null)
  }

  const onGenreOpen = (slug: string) => {
    router.push(`/subgroup/${slug}`)
  }

  const openUpload = useCallback((group?: { id: string; name: string; slug: string } | null) => {
    window.dispatchEvent(
      new CustomEvent('pitch:open-upload', {
        detail: group ? { group } : undefined,
      })
    )
  }, [])

  const applyOptimistic = useCallback((upload: OptimisticUpload) => {
    setNodes((prev) => [...prev, ...upload.nodes])
    setLinks((prev) => [...prev, ...upload.links])
    setHighlightPostId(upload.tempPostId)
    const post = upload.nodes.find((n) => n.kind === 'post')
    if (post) setSelected(post)
  }, [])

  const applyCommit = useCallback(
    (commit: UploadCommit) => {
      const realPostId = `p:${commit.postId}`
      const realHubId = `g:${commit.subgroupId}`
      const tempPostId = `p:${commit.tempPostId}`
      const tempHubId = commit.tempHubId ? `g:${commit.tempHubId}` : null

      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === tempPostId) {
            return {
              ...n,
              id: realPostId,
              subgroupId: commit.subgroupId,
              username: displayUsername(commit.username),
              imageUrl: commit.imageUrl ?? n.imageUrl,
              audioUrl: commit.audioUrl ?? n.audioUrl,
              videoUrl: commit.videoUrl ?? n.videoUrl,
              pending: false,
              clientKey: commit.tempPostId,
            }
          }
          if (tempHubId && n.id === tempHubId) {
            return {
              ...n,
              id: realHubId,
              subgroupId: commit.subgroupId,
              pending: false,
            }
          }
          return n
        })
      )
      setLinks((prev) =>
        prev.map((l) => {
          let source = String(l.source)
          let target = String(l.target)
          if (source === tempPostId) source = realPostId
          if (target === tempHubId) target = realHubId
          if (target === `g:${commit.tempHubId}`) target = realHubId
          return { source, target }
        })
      )
      setHighlightPostId(commit.postId)
      setSelected((prev) => {
        if (!prev || prev.id !== tempPostId) return prev
        return {
          ...prev,
          id: realPostId,
          subgroupId: commit.subgroupId,
          username: displayUsername(commit.username),
          imageUrl: commit.imageUrl ?? prev.imageUrl,
          audioUrl: commit.audioUrl ?? prev.audioUrl,
          videoUrl: commit.videoUrl ?? prev.videoUrl,
          pending: false,
        }
      })
      void loadGraph(expandedParent)
    },
    [expandedParent, loadGraph]
  )

  const applyFail = useCallback(
    (tempPostId: string, tempHubId: string | undefined, message: string) => {
      const postId = `p:${tempPostId}`
      const hubId = tempHubId ? `g:${tempHubId}` : null
      setNodes((prev) => prev.filter((n) => n.id !== postId && n.id !== hubId))
      setLinks((prev) =>
        prev.filter((l) => String(l.source) !== postId && String(l.target) !== hubId)
      )
      setSelected((prev) => (prev?.id === postId ? null : prev))
      setToast(message || 'Upload failed — try again')
    },
    []
  )

  useEffect(() => {
    const onOptimisticEvt = (e: Event) => {
      const upload = (e as CustomEvent).detail as OptimisticUpload
      if (upload) applyOptimistic(upload)
    }
    const onCommitEvt = (e: Event) => {
      const commit = (e as CustomEvent).detail as UploadCommit
      if (commit) applyCommit(commit)
    }
    const onFailEvt = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        tempPostId: string
        tempHubId?: string
        message: string
      }
      if (d) applyFail(d.tempPostId, d.tempHubId, d.message)
    }
    window.addEventListener('pitch:upload-optimistic', onOptimisticEvt)
    window.addEventListener('pitch:upload-commit', onCommitEvt)
    window.addEventListener('pitch:upload-fail', onFailEvt)
    return () => {
      window.removeEventListener('pitch:upload-optimistic', onOptimisticEvt)
      window.removeEventListener('pitch:upload-commit', onCommitEvt)
      window.removeEventListener('pitch:upload-fail', onFailEvt)
    }
  }, [applyOptimistic, applyCommit, applyFail])

  if (!ready) {
    return <div className="min-h-[100dvh] bg-white" />
  }

  const isTextPost = selected?.contentType === 'text'
  const bodyLabel = isTextPost ? 'Text' : 'Description'
  const parentMeta = expandedParent ? getPitchParent(expandedParent) : null

  return (
    <div className="relative bg-white">
      <PitchWeb
        nodes={nodes}
        links={links}
        expandedParent={expandedParent}
        highlightPostId={highlightPostId}
        onUploadClick={() => openUpload()}
        onNodeSelect={setSelected}
        onParentExpand={onParentExpand}
        onGenreOpen={onGenreOpen}
        onCollapse={onCollapse}
      />

      {expandedParent && parentMeta ? (
        <div className="absolute top-4 left-36 sm:left-40 z-10 font-['Space_Mono'] text-xs uppercase tracking-wide text-black/60 pointer-events-none">
          {parentMeta.label}
        </div>
      ) : null}

      {loadError && (
        <div className="absolute top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm border border-black bg-white px-3 py-2 text-xs font-['Space_Mono'] z-20">
          {loadError}
        </div>
      )}

      {toast && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 border border-black bg-white px-4 py-2 text-xs font-['Space_Mono'] z-30">
          {toast}
        </div>
      )}

      {selected?.kind === 'post' && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-[26rem] md:w-[30rem] border border-black bg-white z-20 font-['Space_Mono'] max-h-[78vh] overflow-y-auto shadow-none">
          {(selected.contentType === 'video' || selected.contentType === 'film') &&
          selected.videoUrl ? (
            <video
              key={selected.videoUrl}
              src={selected.videoUrl}
              controls
              playsInline
              className="w-full max-h-80 bg-black border-b border-black"
            />
          ) : selected.contentType === 'music' && selected.audioUrl ? (
            <div className="border-b border-black px-5 py-6 bg-white">
              <audio
                key={selected.audioUrl}
                src={selected.audioUrl}
                controls
                className="w-full"
              />
            </div>
          ) : selected.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt=""
              className="w-full max-h-80 object-cover border-b border-black"
            />
          ) : null}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase text-black/50">
                {selected.contentType || 'post'}
              </p>
              {selected.pending && (
                <p className="text-xs uppercase text-black/40">Saving…</p>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-normal leading-snug">
              {selected.label}
            </h3>
            <p className="text-sm text-black/60">
              by {displayUsername(selected.username)}
            </p>
            {selected.description ? (
              <div className="pt-1">
                <p className="text-xs uppercase text-black/40 mb-2">{bodyLabel}</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className="text-sm underline pt-1"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selected?.kind === 'subgroup' && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 border border-black bg-white z-20 p-5 font-['Space_Mono']">
          <p className="text-xs uppercase text-black/50">Niche</p>
          <h3 className="text-base sm:text-lg font-normal uppercase mt-2">
            {selected.label}
          </h3>
          {typeof selected.postCount === 'number' && (
            <p className="text-xs text-black/50 mt-1">
              {selected.postCount} post{selected.postCount === 1 ? '' : 's'}
            </p>
          )}
          {selected.pending && (
            <p className="text-xs uppercase text-black/40 mt-2">Saving…</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {selected.slug && !selected.pending ? (
              <Link
                href={`/subgroup/${selected.slug}`}
                className="text-sm border border-black bg-black text-white px-4 py-2 uppercase hover:bg-white hover:text-black"
              >
                Open group
              </Link>
            ) : null}
            <button
              type="button"
              className="text-sm border border-black px-4 py-2 uppercase hover:bg-black hover:text-white"
              onClick={() =>
                openUpload(
                  selected.subgroupId
                    ? {
                        id: selected.subgroupId,
                        name: selected.label,
                        slug: selected.slug || '',
                      }
                    : null
                )
              }
            >
              Upload
            </button>
            <button
              type="button"
              className="text-sm underline px-1"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selected?.kind === 'parent' && !expandedParent && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 border border-black bg-white z-20 p-5 font-['Space_Mono']">
          <p className="text-xs uppercase text-black/50">Main group</p>
          <h3 className="text-base sm:text-lg font-normal uppercase mt-2">
            {selected.label}
          </h3>
          <p className="text-xs text-black/50 mt-2">
            Opening niches…
          </p>
        </div>
      )}

      {!entered && <PitchOnboarding onComplete={enter} />}
    </div>
  )
}
