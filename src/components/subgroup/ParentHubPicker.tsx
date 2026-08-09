'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ParentSuggestion } from '@/lib/pitch-place'

type Props = {
  name: string
  description?: string
  value: string[]
  onChange: (parentHubIds: string[]) => void
}

export default function ParentHubPicker({
  name,
  description = '',
  value,
  onChange,
}: Props) {
  const [suggestions, setSuggestions] = useState<ParentSuggestion[]>([])
  const [recommended, setRecommended] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [appliedDefault, setAppliedDefault] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (name.trim().length < 2) {
      setSuggestions([])
      setRecommended([])
      return
    }
    const t = window.setTimeout(async () => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          name: name.trim(),
          description: description.trim(),
        })
        const res = await fetch(`/api/pitch/suggest-parents?${qs}`)
        const data = await res.json()
        if (!res.ok) return
        const nextSuggestions: ParentSuggestion[] = data.suggestions || []
        const suggestionIds = new Set(nextSuggestions.map((s) => s.hubId))
        // Never recommend an id that isn't a visible chip
        const nextRecommended = ((data.recommended as string[]) || []).filter(
          (id) => suggestionIds.has(id)
        )
        setSuggestions(nextSuggestions)
        setRecommended(nextRecommended)

        const key = name.trim().toLowerCase()
        if (appliedDefault !== key && nextRecommended.length) {
          onChange(nextRecommended.slice(0, 1))
          setAppliedDefault(key)
        } else if (appliedDefault === key && value.length) {
          // Drop ghost selections that vanished from the list
          const kept = value.filter((id) => suggestionIds.has(id))
          if (kept.length !== value.length) onChange(kept.slice(0, 2))
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-suggest on name/desc
  }, [name, description])

  const selectedChips = useMemo(() => {
    return value
      .map((id) => {
        const fromList = suggestions.find((s) => s.hubId === id)
        if (fromList) return fromList
        return {
          hubId: id,
          label: id.startsWith('sg:') ? 'Selected group' : id.replace(/-/g, ' '),
          score: 1,
          depth: 2,
        } satisfies ParentSuggestion
      })
      .filter(Boolean)
  }, [value, suggestions])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const rest = suggestions.filter((s) => !value.includes(s.hubId))
    const filtered = q
      ? rest.filter((s) => s.label.toLowerCase().includes(q))
      : rest
    // Selected always stay visible at the front (even when filter mismatches)
    return [...selectedChips, ...filtered]
  }, [suggestions, filter, value, selectedChips])

  const toggle = (hubId: string) => {
    if (value.includes(hubId)) {
      onChange(value.filter((id) => id !== hubId))
      return
    }
    if (value.length >= 2) {
      onChange([value[0], hubId])
      return
    }
    onChange([...value, hubId])
  }

  return (
    <div className="space-y-3 font-['Space_Mono']">
      <div>
        <p className="text-[10px] uppercase tracking-wide text-black/45 mb-1">
          Parent groups
        </p>
        <p className="text-sm text-black/70 leading-relaxed">
          Pick 1–2 specific groups this hangs under.
        </p>
      </div>

      {suggestions.length > 8 && (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter groups"
          className="w-full border border-black px-3 py-2 text-xs bg-white outline-none"
          aria-label="Filter parent groups"
        />
      )}

      {loading && (
        <p className="text-[10px] uppercase tracking-wide text-black/40">
          Loading groups…
        </p>
      )}

      <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto content-start">
        {visible.map((s) => {
          const on = value.includes(s.hubId)
          const isRec = recommended.includes(s.hubId)
          return (
            <button
              key={s.hubId}
              type="button"
              onClick={() => toggle(s.hubId)}
              className={`px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-wide border border-black transition-colors ${
                on
                  ? 'bg-black text-white'
                  : isRec
                    ? 'bg-black/5 hover:bg-black hover:text-white'
                    : 'bg-white hover:bg-black hover:text-white'
              }`}
              title={s.depth >= 2 ? 'Niche / group' : 'Main category'}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {!loading && name.trim().length >= 2 && visible.length === 0 && (
        <p className="text-[10px] uppercase tracking-wide text-black/40">
          No matching groups
        </p>
      )}

      {value.length === 0 && name.trim().length >= 2 && (
        <p className="text-[10px] uppercase text-red-600/80">
          Select at least one parent
        </p>
      )}
      {value.length > 0 && (
        <p className="text-[10px] uppercase tracking-wide text-black/40">
          {value.length}/2 selected
        </p>
      )}
    </div>
  )
}
