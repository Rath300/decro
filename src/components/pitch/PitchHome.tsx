'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PitchGraphLink, PitchGraphNode } from '@/app/api/pitch/graph/route'
import { PITCH_TOUR_PARENT_ID, type PitchTourStage } from '@/lib/pitch-copy'
import { getPitchHub } from '@/lib/pitch-taxonomy'
import PitchWeb from '@/components/pitch/PitchWeb'
import PitchOnboarding from '@/components/pitch/PitchOnboarding'
import type {
  OptimisticUpload,
  UploadCommit,
} from '@/components/pitch/PitchUploadSheet'

const ENTERED_KEY = 'decro_pitch_onboarded_v7'

function displayUsername(raw?: string | null) {
  if (!raw || /^anonymous(_|$)/i.test(raw)) return 'anonymous'
  return raw
}

export default function PitchHome() {
  const router = useRouter()
  const [tourStage, setTourStage] = useState<PitchTourStage | null>(null)
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<PitchGraphNode[]>([])
  const [links, setLinks] = useState<PitchGraphLink[]>([])
  const [startHubIds, setStartHubIds] = useState<string[]>([])
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [focusHubId, setFocusHubId] = useState<string | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [resetNonce, setResetNonce] = useState(0)
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null)
  const [selected, setSelected] = useState<PitchGraphNode | null>(null)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const [pendingNicheSlug, setPendingNicheSlug] = useState<string | null>(null)

  useEffect(() => {
    try {
      const restart = sessionStorage.getItem('decro_pitch_restart_tour') === '1'
      if (restart) {
        sessionStorage.removeItem('decro_pitch_restart_tour')
        sessionStorage.removeItem(ENTERED_KEY)
        setTourStage('welcome')
      } else {
        const done = sessionStorage.getItem(ENTERED_KEY) === '1'
        setTourStage(done ? 'done' : 'welcome')
      }
    } catch {
      setTourStage('welcome')
    }
    setReady(true)
  }, [])

  const finishTour = useCallback(() => {
    try {
      sessionStorage.setItem(ENTERED_KEY, '1')
    } catch {}
    setTourStage('done')
  }, [])

  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/pitch/graph', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load graph')
      const remote = (data.nodes || []) as PitchGraphNode[]
      const remoteLinks = (data.links || []) as PitchGraphLink[]
      const start = (data.startHubIds || []) as string[]
      setNodes((prev) => {
        const pending = prev.filter((n) => n.pending)
        const pendingIds = new Set(pending.map((n) => n.id))
        return [...remote.filter((n) => !pendingIds.has(n.id)), ...pending]
      })
      setLinks((prev) => {
        const pendingLinks = prev.filter(
          (l) =>
            String(l.source).startsWith('p:temp-') ||
            String(l.target).startsWith('g:temp-')
        )
        return [...remoteLinks, ...pendingLinks]
      })
      setStartHubIds(start)
      setRevealedIds((prev) => {
        if (prev.size === 0) return new Set(start)
        // Keep user reveals; ensure start hubs always present
        const next = new Set(prev)
        for (const id of start) next.add(id)
        return next
      })
      setLoadError('')
    } catch (e: any) {
      setLoadError(e?.message || 'Could not load the web')
    }
  }, [])

  useEffect(() => {
    void loadGraph()
  }, [loadGraph])

  const resetWebToMains = useCallback(() => {
    setSelected(null)
    setFocusHubId(null)
    setRevealedIds(new Set(startHubIds))
    setResetNonce((n) => n + 1)
  }, [startHubIds])

  useEffect(() => {
    const onOverlay = () => {
      resetWebToMains()
      setTourStage('welcome')
      try {
        sessionStorage.removeItem(ENTERED_KEY)
        sessionStorage.removeItem('decro_pitch_onboarded_v6')
        sessionStorage.removeItem('decro_pitch_onboarded_v5')
        sessionStorage.removeItem('decro_pitch_onboarded_v4')
        sessionStorage.removeItem('decro_pitch_onboarded_v3')
        sessionStorage.removeItem('decro_pitch_onboarded_v2')
      } catch {}
    }
    const onResetWeb = () => {
      resetWebToMains()
    }
    window.addEventListener('pitch:show-overlay', onOverlay)
    window.addEventListener('pitch:reset-web', onResetWeb)
    return () => {
      window.removeEventListener('pitch:show-overlay', onOverlay)
      window.removeEventListener('pitch:reset-web', onResetWeb)
    }
  }, [resetWebToMains])

  // Duck navigated here from another page — collapse to mains
  useEffect(() => {
    if (!startHubIds.length) return
    try {
      if (sessionStorage.getItem('decro_pitch_reset_web') === '1') {
        sessionStorage.removeItem('decro_pitch_reset_web')
        resetWebToMains()
      }
    } catch {}
  }, [startHubIds, resetWebToMains])

  // Search (or external) → reveal ancestors and focus hub on the web
  const applyFocusHub = useCallback(
    (hubId: string) => {
      if (!hubId || !nodes.length) return
      const exists = nodes.some((n) => n.hubId === hubId)
      if (!exists) return
      setRevealedIds((prev) => {
        const next = new Set(prev)
        next.add(hubId)
        // Walk ancestors so niches under collapsed parents become visible
        const queue = [...(nodes.find((n) => n.hubId === hubId)?.parentIds || [])]
        const seen = new Set<string>()
        while (queue.length) {
          const pid = queue.pop()!
          if (seen.has(pid)) continue
          seen.add(pid)
          next.add(pid)
          const parents =
            nodes.find((n) => n.hubId === pid)?.parentIds || []
          for (const p of parents) queue.push(p)
        }
        return next
      })
      setSelected(nodes.find((n) => n.hubId === hubId) || null)
      setFocusHubId(hubId)
      setFocusKey((k) => k + 1)
    },
    [nodes]
  )

  useEffect(() => {
    if (!nodes.length || startHubIds.length === 0) return
    let hubId: string | null = null
    try {
      hubId = sessionStorage.getItem('decro_pitch_focus_hub')
      if (hubId) sessionStorage.removeItem('decro_pitch_focus_hub')
    } catch {
      return
    }
    if (!hubId) return
    applyFocusHub(hubId)
  }, [nodes, startHubIds.length, applyFocusHub])

  useEffect(() => {
    const onFocus = (e: Event) => {
      const hubId = (e as CustomEvent<{ hubId?: string }>).detail?.hubId
      if (hubId) applyFocusHub(hubId)
    }
    window.addEventListener('pitch:focus-hub', onFocus)
    return () => window.removeEventListener('pitch:focus-hub', onFocus)
  }, [applyFocusHub])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 4000)
    return () => window.clearTimeout(t)
  }, [toast])

  const focusCluster = useCallback((hubId: string) => {
    setFocusHubId(hubId)
    setFocusKey((k) => k + 1)
  }, [])

  const onRevealChildren = useCallback(
    (hubId: string) => {
      // Prefer graph childIds so user-placed niches expand with curated ones
      const fromGraph =
        nodes.find((n) => n.kind === 'hub' && n.hubId === hubId)?.childIds || []
      setRevealedIds((prev) => {
        const next = new Set(prev)
        next.add(hubId)
        for (const id of fromGraph) next.add(id)
        return next
      })
      focusCluster(hubId)
    },
    [focusCluster, nodes]
  )

  /** Collapse niches under a hub (Decro → full reset to mains). */
  const onCollapseChildren = useCallback(
    (hubId: string) => {
      if (hubId === 'decro') {
        resetWebToMains()
        return
      }
      const start = new Set(startHubIds)
      const toRemove = new Set<string>()
      const queue = [
        ...(nodes.find((n) => n.hubId === hubId)?.childIds || []),
      ]
      while (queue.length) {
        const id = queue.pop()!
        if (toRemove.has(id) || start.has(id)) continue
        toRemove.add(id)
        const kids =
          nodes.find((n) => n.hubId === id)?.childIds || []
        for (const k of kids) queue.push(k)
      }
      setRevealedIds((prev) => {
        const next = new Set(prev)
        for (const id of toRemove) next.delete(id)
        return next
      })
      setSelected(null)
      // Don't refocus/zoom — leave the camera still so collapse feels instant
      setFocusHubId(null)
    },
    [nodes, startHubIds, resetWebToMains]
  )

  const onEnterHub = useCallback(
    (slug: string) => {
      router.push(`/subgroup/${slug}`)
    },
    [router]
  )

  const onResetView = resetWebToMains

  const onTourNext = () => {
    if (tourStage === 'welcome') {
      setTourStage('click-main')
      return
    }
    if (tourStage === 'click-main') {
      // Demo zoom so Next never traps the user waiting for a graph click
      onRevealChildren(PITCH_TOUR_PARENT_ID)
      setTourStage('click-niche')
      return
    }
    if (tourStage === 'click-niche') {
      setTourStage('upload')
      return
    }
    if (tourStage === 'upload') {
      setTourStage('search')
      return
    }
    if (tourStage === 'search') {
      setTourStage('create')
      return
    }
    if (tourStage === 'create') {
      setTourStage('guest')
      return
    }
    if (tourStage === 'guest') {
      const slug = pendingNicheSlug
      setPendingNicheSlug(null)
      finishTour()
      if (slug) router.push(`/subgroup/${slug}`)
    }
  }

  const onTourMainOpened = (hubId: string) => {
    if (tourStage === 'click-main') {
      onRevealChildren(hubId)
      setTourStage('click-niche')
    }
  }

  const onTourNicheOpened = (slug: string) => {
    if (tourStage === 'click-niche') {
      setPendingNicheSlug(slug)
      setTourStage('guest')
      return
    }
    onEnterHub(slug)
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
      const tempPostId = `p:${commit.tempPostId}`
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
          return n
        })
      )
      setHighlightPostId(commit.postId)
      void loadGraph()
    },
    [loadGraph]
  )

  const applyFail = useCallback(
    (tempPostId: string, _tempHubId: string | undefined, message: string) => {
      const postId = `p:${tempPostId}`
      setNodes((prev) => prev.filter((n) => n.id !== postId))
      setLinks((prev) => prev.filter((l) => String(l.source) !== postId))
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

  const selectedMeta = useMemo(() => {
    if (!selected || selected.kind !== 'hub') return null
    const hub = selected.hubId ? getPitchHub(selected.hubId) : null
    const parentLabels = (selected.parentIds || [])
      .map((id) => getPitchHub(id)?.label)
      .filter(Boolean) as string[]
    const unrevealed = (selected.childIds || []).filter((id) => !revealedIds.has(id))
    return { hub, parentLabels, unrevealed }
  }, [selected, revealedIds])

  if (!ready || tourStage === null) {
    return <div className="min-h-[100dvh] bg-white" />
  }

  const hidePanels = tourStage === 'click-main' || tourStage === 'click-niche'

  return (
    <div className="relative bg-white">
      <PitchWeb
        nodes={nodes}
        links={links}
        startHubIds={startHubIds}
        revealedIds={revealedIds}
        focusHubId={focusHubId}
        focusKey={focusKey}
        resetNonce={resetNonce}
        highlightPostId={highlightPostId}
        tourStage={tourStage}
        tourParentId={PITCH_TOUR_PARENT_ID}
        onUploadClick={() => openUpload()}
        onNodeSelect={hidePanels ? undefined : setSelected}
        onRevealChildren={onRevealChildren}
        onCollapseChildren={onCollapseChildren}
        onEnterHub={onEnterHub}
        onResetView={onResetView}
        onTourMainOpened={onTourMainOpened}
        onTourNicheOpened={onTourNicheOpened}
      />

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

      {!hidePanels && selected?.kind === 'hub' && selectedMeta && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-96 border border-black bg-white z-20 p-5 font-['Space_Mono']">
          <p className="text-xs uppercase text-black/50">
            {selected.isBridge
              ? 'Bridge · two parents'
              : selected.depth === 0
                ? 'Center'
                : selected.depth === 1
                  ? 'Main group'
                  : 'Niche'}
          </p>
          <h3 className="text-base sm:text-lg font-normal uppercase mt-2">
            {selected.label}
          </h3>
          {selectedMeta.parentLabels.length > 0 && (
            <p className="text-xs text-black/50 mt-2">
              Linked from {selectedMeta.parentLabels.join(' + ')}
            </p>
          )}
          {typeof selected.postCount === 'number' && selected.enterable && (
            <p className="text-xs text-black/50 mt-1">
              {selected.postCount} post{selected.postCount === 1 ? '' : 's'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {selected.enterable && selected.slug ? (
              <button
                type="button"
                className="text-sm border border-black bg-black text-white px-4 py-2 uppercase hover:bg-white hover:text-black"
                onClick={() => onEnterHub(selected.slug!)}
              >
                Enter group
              </button>
            ) : null}
            {selectedMeta.unrevealed.length > 0 && selected.hubId ? (
              <button
                type="button"
                className="text-sm border border-black px-4 py-2 uppercase hover:bg-black hover:text-white"
                onClick={() => onRevealChildren(selected.hubId!)}
              >
                Zoom in
              </button>
            ) : selected.hubId && (selected.childIds || []).length > 0 ? (
              <button
                type="button"
                className="text-sm border border-black px-4 py-2 uppercase hover:bg-black hover:text-white"
                onClick={() => focusCluster(selected.hubId!)}
              >
                Zoom in
              </button>
            ) : null}
            {selected.enterable && selected.subgroupId ? (
              <button
                type="button"
                className="text-sm border border-black px-4 py-2 uppercase hover:bg-black hover:text-white"
                onClick={() =>
                  openUpload({
                    id: selected.subgroupId!,
                    name: selected.label,
                    slug: selected.slug || '',
                  })
                }
              >
                Upload
              </button>
            ) : null}
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

      {!hidePanels && selected?.kind === 'post' && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-5 sm:w-[26rem] border border-black bg-white z-20 font-['Space_Mono'] max-h-[78vh] overflow-y-auto">
          {selected.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selected.imageUrl}
              alt=""
              className="w-full max-h-80 object-cover border-b border-black"
            />
          ) : null}
          <div className="p-5 space-y-3">
            <h3 className="text-base font-normal">{selected.label}</h3>
            <p className="text-sm text-black/60">
              by {displayUsername(selected.username)}
            </p>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {tourStage !== 'done' && (
        <PitchOnboarding
          stage={tourStage}
          onNext={onTourNext}
          onSkip={finishTour}
        />
      )}
    </div>
  )
}
