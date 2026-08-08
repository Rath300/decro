'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PITCH_HUBS, hubSlug } from '@/lib/pitch-taxonomy'

type Hit = {
  kind: 'hub' | 'subgroup'
  id: string
  label: string
  slug?: string | null
  hubId?: string
}

export default function PitchGroupSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

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
        const dbHits: Hit[] = (data.items || []).slice(0, 8).map((g: any) => ({
          kind: 'subgroup' as const,
          id: g.id,
          label: g.name,
          slug: g.slug,
        }))
        // Prefer unique by label
        const seen = new Set(hubHits.map((h) => h.label.toLowerCase()))
        const merged = [
          ...hubHits,
          ...dbHits.filter((h) => !seen.has(h.label.toLowerCase())),
        ].slice(0, 10)
        setHits(merged)
      } catch {
        setHits(hubHits)
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [q])

  const go = (hit: Hit) => {
    setOpen(false)
    setQ('')
    if (hit.slug) {
      router.push(`/subgroup/${hit.slug}`)
      return
    }
    // Non-enterable hub — go home and ask graph to focus
    try {
      sessionStorage.setItem('decro_pitch_focus_hub', hit.hubId || hit.id)
    } catch {}
    router.push('/')
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 max-w-xs sm:max-w-sm">
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
