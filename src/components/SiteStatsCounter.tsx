'use client'

import { useEffect, useState } from 'react'

type Stats = {
  posts: number
  subgroups: number
  users: number
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en-US').format(n)
}

export default function SiteStatsCounter() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/site-stats', { credentials: 'include' })
        if (!res.ok) return
        const data = (await res.json()) as Stats
        if (alive) setStats(data)
      } catch {
        // silent — counter is decorative
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!stats) return null

  return (
    <div
      className="pointer-events-none fixed top-[7.25rem] left-0 z-[55] px-2 sm:px-4"
      aria-label="Site stats"
    >
      <div className="pointer-events-none font-['Space_Mono'] text-[9px] sm:text-[10px] uppercase tracking-wide text-neutral-500 leading-tight text-left">
        <div>
          <span className="text-neutral-500">{formatCount(stats.posts)}</span> posts
        </div>
        <div>
          <span className="text-neutral-500">{formatCount(stats.subgroups)}</span> groups
        </div>
        <div>
          <span className="text-neutral-500">{formatCount(stats.users)}</span> users
        </div>
      </div>
    </div>
  )
}
