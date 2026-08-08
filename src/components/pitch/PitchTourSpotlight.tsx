'use client'

import { useEffect, useState } from 'react'

type Rect = { top: number; left: number; width: number; height: number }

/** Highlights a [data-tour="…"] control during the interactive tutorial. */
export default function PitchTourSpotlight({
  target,
}: {
  target: string | null | undefined
}) {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!target || target === 'graph') {
      setRect(null)
      return
    }

    const measure = () => {
      const el = document.querySelector(
        `[data-tour="${target}"]`
      ) as HTMLElement | null
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      const pad = 5
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: Math.max(r.width + pad * 2, 8),
        height: Math.max(r.height + pad * 2, 8),
      })
    }

    measure()
    const t = window.setInterval(measure, 350)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [target])

  if (!rect) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[68]">
      <div
        className="absolute border-2 border-black animate-pulse"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}
