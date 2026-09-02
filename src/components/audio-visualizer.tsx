'use client'

import { useMemo } from 'react'

/**
 * Brutalist equalizer for audio posts that have no real cover art. Bar heights
 * are derived deterministically from a seed (the post id) so each post keeps a
 * stable, distinct waveform, and the bars animate only while the clip plays.
 */
function seededHeights(seed: string, count: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: count }, () => 0.2 + rand() * 0.8)
}

export default function AudioVisualizer({
  seed,
  playing = false,
  bars = 40,
  className = '',
}: {
  seed: string
  playing?: boolean
  bars?: number
  className?: string
}) {
  const heights = useMemo(() => seededHeights(seed, bars), [seed, bars])

  return (
    <div
      className={`flex items-end justify-between gap-[2px] ${className}`}
      aria-hidden="true"
    >
      {heights.map((height, i) => (
        <span
          key={i}
          className={`flex-1 bg-black ${playing ? 'decro-eq-bar' : ''}`}
          style={{
            height: `${Math.round(height * 100)}%`,
            transformOrigin: 'bottom',
            animationDelay: `${(i % 12) * 80}ms`,
          }}
        />
      ))}
    </div>
  )
}
