'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { PITCH_HUBS, hubSlug, userHubId } from '@/lib/pitch-taxonomy'

type Hit = {
  kind: 'hub' | 'subgroup'
  id: string
  label: string
  slug?: string | null
  hubId?: string
}

function focusHubOnWeb(hubId: string) {
  try {
    sessionStorage.setItem('decro_pitch_focus_hub', hubId)
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent('pitch:focus-hub', { detail: { hubId } })
    )
  } catch {}
}

export default function PitchGroupSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  const slugToHubId = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of PITCH_HUBS) {
      const s = hubSlug(h)
      if (s) map.set(s, h.id)
    }
    return map
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const query = q.trim().toLowerCase()
    if (query.length < 1) {
      setHits([])
      return
    }

    const hubHits: Hit[] = PITCH_HUBS.filter(
      (h) =>
        h.depth >= 1 &&
        (h.label.toLowerCase().includes(query) ||
          h.id.includes(query) ||
          (h.aliases || []).some((a) => a.toLowerCase().includes(query)))
    )
      .slice(0, 8)
      .map((h) => ({
        kind: 'hub' as const,
        id: h.id,
        label: h.label,
        slug: hubSlug(h),
        hubId: h.id,
      }))

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/subgroups?query=${encodeURIComponent(query)}`
        )
        const data = await res.json()
        if (!res.ok) {
          setHits(hubHits)
          return
        }
        const dbHits: Hit[] = (data.items || []).slice(0, 12).map((g: any) => {
          // Curated genre rows live on the web as taxonomy hubs, not sg:uuid
          const taxHub = g.slug ? slugToHubId.get(g.slug) : null
          return {
            kind: 'subgroup' as const,
            id: g.id,
            label: g.name,
            slug: g.slug,
            hubId: taxHub || userHubId(g.id),
          }
        })

        const seenHub = new Set<string>()
        const seenLabel = new Set<string>()
        const merged: Hit[] = []

        // Prefer real / user groups first so they aren't crowded out by mains
        for (const h of [...dbHits, ...hubHits]) {
          const hubKey = h.hubId || h.id
          const labelKey = h.label.toLowerCase()
          if (seenHub.has(hubKey) || seenLabel.has(labelKey)) continue
          seenHub.add(hubKey)
          seenLabel.add(labelKey)
          merged.push(h)
          if (merged.length >= 12) break
        }
        setHits(merged)
      } catch {
        setHits(hubHits)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [q, slugToHubId])

  const go = (hit: Hit) => {
    setOpen(false)
    setQ('')
    const hubId =
      hit.hubId ||
      (hit.kind === 'subgroup' ? userHubId(hit.id) : hit.id)
    focusHubOnWeb(hubId)
    // Ask home to reload graph if the node isn't loaded yet
    try {
      window.dispatchEvent(new CustomEvent('pitch:reload-graph'))
    } catch {}
    if (pathname !== '/') router.push('/')
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search groups"
        className="w-full border border-black px-2.5 py-1.5 text-xs font-['Space_Mono'] bg-white outline-none"
        aria-label="Search groups"
      />
      {open && q.trim().length >= 1 && hits.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-black bg-white z-[70] px-3 py-2 text-[10px] uppercase tracking-wide text-black/40 font-['Space_Mono']">
          No groups found
        </div>
      )}
      {open && hits.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 border border-black bg-white z-[70] max-h-64 overflow-y-auto shadow-none">
          {hits.map((h) => (
            <li key={`${h.kind}:${h.id}`}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-[10px] sm:text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-black hover:text-white"
                onClick={() => go(h)}
              >
                {h.label}
                <span className="ml-2 text-black/30 hover:text-white/50 normal-case">
                  {h.kind === 'hub' ? 'web' : 'group'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
