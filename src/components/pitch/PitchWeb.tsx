'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react'
import type { PitchGraphLink, PitchGraphNode } from '@/app/api/pitch/graph/route'
import { PITCH_HINT, type PitchTourStage } from '@/lib/pitch-copy'
import { parseHubNodeId } from '@/lib/pitch-taxonomy'

type ForceGraphComponent = ComponentType<any>

type GraphNode = PitchGraphNode & {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

type Props = {
  nodes: PitchGraphNode[]
  links: PitchGraphLink[]
  startHubIds: string[]
  revealedIds: Set<string>
  /** Hub just expanded — camera zooms into its local cluster */
  focusHubId?: string | null
  /** Bump to re-zoom the same hub (e.g. Zoom in pressed again) */
  focusKey?: number
  /** Bump when collapsing to mains — camera refits */
  resetNonce?: number
  highlightPostId?: string | null
  tourStage?: PitchTourStage | null
  tourParentId?: string | null
  onUploadClick: () => void
  onNodeSelect?: (node: PitchGraphNode | null) => void
  onRevealChildren?: (hubId: string) => void
  /** Collapse niches under a hub; Decro resets to mains */
  onCollapseChildren?: (hubId: string) => void
  onEnterHub?: (slug: string) => void
  onResetView?: () => void
  onTourMainOpened?: (hubId: string) => void
  onTourNicheOpened?: (slug: string) => void
}

function hashSeed(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function hubFontPx(n: PitchGraphNode, globalScale: number, focused: boolean) {
  const depth = n.depth ?? 1
  const bridge = n.isBridge ? 1.5 : 0
  let base = depth === 0 ? 20 : depth === 1 ? 15 : 12 + bridge
  if (focused) base += 3
  // Keep labels readable when zoomed out
  return Math.max(base / Math.sqrt(Math.max(globalScale, 0.35)), 7)
}

export default function PitchWeb({
  nodes,
  links,
  startHubIds,
  revealedIds,
  focusHubId = null,
  focusKey = 0,
  resetNonce = 0,
  highlightPostId,
  tourStage = null,
  tourParentId = null,
  onUploadClick,
  onNodeSelect,
  onRevealChildren,
  onCollapseChildren,
  onEnterHub,
  onResetView,
  onTourMainOpened,
  onTourNicheOpened,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [ForceGraph2D, setForceGraph2D] = useState<ForceGraphComponent | null>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const hoverIdRef = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const [viewZoom, setViewZoom] = useState(1)
  const posCache = useRef(
    new Map<string, { x: number; y: number; vx?: number; vy?: number }>()
  )
  const lastClickRef = useRef<{ id: string; at: number } | null>(null)
  const fittedRef = useRef(false)
  const cameraLockUntil = useRef(0)
  const lastFocusRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    import('./PitchForceGraph').then((mod) => {
      if (alive) setForceGraph2D(() => mod.default as ForceGraphComponent)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDims({ w: Math.max(320, width), h: Math.max(320, height) })
    })
    ro.observe(el)
    setDims({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (tourStage !== 'click-main' && tourStage !== 'click-niche') return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      setPulse((Math.sin((t - start) / 280) + 1) / 2)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [tourStage])

  const graphData = useMemo(() => {
    const visible = nodes.filter((n) => {
      if (n.kind === 'post') return true
      const hid = n.hubId || parseHubNodeId(n.id)
      return hid ? revealedIds.has(hid) : false
    })

    const byHub = new Map(
      visible
        .filter((n) => n.kind === 'hub' && n.hubId)
        .map((n) => [n.hubId!, n])
    )

    const gNodes: GraphNode[] = visible.map((n) => {
      const cached = posCache.current.get(n.id)
      if (cached) return { ...n, ...cached }

      if (n.kind === 'hub' && n.depth === 0) {
        return { ...n, x: 0, y: 0, fx: 0, fy: 0 }
      }

      // Seed near first revealed parent, else around center by depth.
      const parents = (n.parentIds || [])
        .map((pid) => byHub.get(pid))
        .filter(Boolean) as PitchGraphNode[]
      const seed = hashSeed(n.id)
      const angle = ((seed % 360) / 360) * Math.PI * 2

      if (parents.length) {
        const px =
          parents.reduce((s, p) => s + ((p as GraphNode).x || 0), 0) /
          parents.length
        const py =
          parents.reduce((s, p) => s + ((p as GraphNode).y || 0), 0) /
          parents.length
        // Prefer cached parent positions from posCache
        let ax = 0
        let ay = 0
        let count = 0
        for (const p of parents) {
          const c = posCache.current.get(p.id)
          if (c) {
            ax += c.x
            ay += c.y
            count++
          }
        }
        const cx = count ? ax / count : px
        const cy = count ? ay / count : py
        const radius = n.isBridge ? 100 + (seed % 50) : 90 + (seed % 70)
        return {
          ...n,
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        }
      }

      const depth = n.depth ?? 1
      const radius = 70 + depth * 70 + (seed % 40)
      return {
        ...n,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        ...(depth === 0 ? { fx: 0, fy: 0 } : {}),
      }
    })

    // Ensure center stays pinned
    for (const n of gNodes) {
      if (n.depth === 0) {
        n.x = 0
        n.y = 0
        n.fx = 0
        n.fy = 0
      }
    }

    const ids = new Set(gNodes.map((n) => n.id))
    const gLinks = links
      .filter((l) => ids.has(String(l.source)) && ids.has(String(l.target)))
      .map((l) => ({ ...l }))

    return { nodes: gNodes, links: gLinks }
  }, [nodes, links, revealedIds])

  useEffect(() => {
    if (!graphReady) return
    const fg = fgRef.current
    if (!fg) return

    fg.d3Force?.('charge')?.strength((node: GraphNode) => {
      if (node.depth === 0) return -120
      if (node.depth === 1) return -180
      if (node.isBridge) return -140
      return -110
    })
    fg.d3Force?.('charge')?.distanceMax?.(520)
    fg.d3Force?.('link')?.distance((link: any) => {
      const s = typeof link.source === 'object' ? link.source : null
      const t = typeof link.target === 'object' ? link.target : null
      if (s?.depth === 0 || t?.depth === 0) return 120
      if (s?.isBridge || t?.isBridge) return 100
      return 88
    })
    fg.d3Force?.('link')?.strength?.(0.35)
    fg.d3Force?.('center')?.strength?.(0.035)
    try {
      fg.d3ReheatSimulation?.()
    } catch {
      /* ignore */
    }
  }, [graphData, graphReady])

  const getFg = useCallback(() => {
    const fg = fgRef.current
    if (!fg || typeof fg.zoom !== 'function' || typeof fg.centerAt !== 'function') {
      return null
    }
    return fg
  }, [])

  const fitMains = useCallback(
    (ms = 500) => {
      const fg = getFg()
      if (!fg) return
      cameraLockUntil.current = Date.now() + ms + 40
      // Start / reset: only frame the center + mains (readable).
      const hubs = graphData.nodes.filter(
        (n) => n.kind === 'hub' && (n.depth ?? 0) <= 1
      )
      if (!hubs.length) {
        fg.centerAt(0, 0, ms)
        fg.zoom(1.1, ms)
        setViewZoom(1.1)
        return
      }
      const xs = hubs.map((h) => h.x ?? 0)
      const ys = hubs.map((h) => h.y ?? 0)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const span = Math.max(maxX - minX, maxY - minY, 220)
      const short = Math.min(dims.w, dims.h)
      const zoom = Math.min(1.55, Math.max(0.85, (short * 0.62) / span))
      fg.centerAt(cx, cy, ms)
      fg.zoom(zoom, ms)
      setViewZoom(zoom)
    },
    [getFg, graphData.nodes, dims.w, dims.h]
  )

  const zoomToCluster = useCallback(
    (hubId: string, ms = 750) => {
      const fg = getFg()
      if (!fg) return
      const parent = graphData.nodes.find(
        (n) => n.kind === 'hub' && n.hubId === hubId
      )
      if (!parent || parent.x == null || parent.y == null) return
      const kids = graphData.nodes.filter(
        (n) =>
          n.kind === 'hub' &&
          n.hubId !== hubId &&
          (n.parentIds || []).includes(hubId) &&
          n.x != null &&
          n.y != null
      )
      const xs = [parent.x, ...kids.map((k) => k.x!)]
      const ys = [parent.y, ...kids.map((k) => k.y!)]
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const span = Math.max(maxX - minX, maxY - minY, 140)
      const short = Math.min(dims.w, dims.h)
      const zoom = Math.min(2.8, Math.max(1.35, (short * 0.7) / span))
      cameraLockUntil.current = Date.now() + ms + 80
      fg.centerAt(cx, cy, ms)
      fg.zoom(zoom, ms)
      setViewZoom(zoom)
    },
    [getFg, graphData.nodes, dims.w, dims.h]
  )

  const nudgeToNode = useCallback(
    (node: GraphNode, ms = 650) => {
      const hid = node.hubId
      if (hid) {
        zoomToCluster(hid, ms)
        return
      }
      const fg = getFg()
      if (!fg || node.x == null || node.y == null) return
      cameraLockUntil.current = Date.now() + ms + 40
      fg.centerAt(node.x, node.y, ms)
      const zoom = Math.min(2.4, Math.max(1.4, (fg.zoom() || 1) * 1.35))
      fg.zoom(zoom, ms)
      setViewZoom(zoom)
    },
    [getFg, zoomToCluster]
  )

  const panByScreen = useCallback(
    (dx: number, dy: number) => {
      if (Date.now() < cameraLockUntil.current) return
      const fg = getFg()
      if (!fg) return
      const c = fg.centerAt()
      const k = fg.zoom() || 1
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) return
      fg.centerAt(c.x + (dx * 0.55) / k, c.y + (dy * 0.55) / k, 0)
    },
    [getFg]
  )

  const setZoomLevel = useCallback(
    (next: number, ms = 0) => {
      if (Date.now() < cameraLockUntil.current && ms === 0) return
      const fg = getFg()
      if (!fg) return
      const z = Math.min(4, Math.max(0.4, next))
      fg.zoom(z, ms)
      setViewZoom(z)
    },
    [getFg]
  )

  useEffect(() => {
    if (!graphReady) return
    const el = containerRef.current
    if (!el) return

    let target: HTMLElement | null = null
    let raf = 0
    let cancelled = false
    let dragging = false
    let lastX = 0
    let lastY = 0

    const onWheel = (e: WheelEvent) => {
      const fg = getFg()
      if (!fg) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.ctrlKey || e.metaKey) {
        const k = fg.zoom() || 1
        setZoomLevel(k * Math.exp(-e.deltaY * 0.008))
        return
      }
      const scale = e.deltaMode === 1 ? 10 : e.deltaMode === 2 ? 16 : 0.7
      panByScreen(e.deltaX * scale, e.deltaY * scale)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement)?.tagName !== 'CANVAS') return
      if (hoverIdRef.current) return
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      el.setPointerCapture?.(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      panByScreen(-dx, -dy)
    }
    const onPointerUp = (e: PointerEvent) => {
      dragging = false
      try {
        el.releasePointerCapture?.(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const bind = () => {
      if (cancelled) return
      const canvas = el.querySelector('canvas')
      if (!canvas) {
        raf = window.requestAnimationFrame(bind)
        return
      }
      target = canvas
      target.addEventListener('wheel', onWheel, { passive: false, capture: true })
      el.addEventListener('wheel', onWheel, { passive: false, capture: true })
      el.addEventListener('pointerdown', onPointerDown)
      el.addEventListener('pointermove', onPointerMove)
      el.addEventListener('pointerup', onPointerUp)
      el.addEventListener('pointercancel', onPointerUp)
    }
    bind()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      target?.removeEventListener('wheel', onWheel, true)
      el.removeEventListener('wheel', onWheel, true)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
    }
  }, [graphReady, getFg, panByScreen, setZoomLevel])

  // Initial fit — mains only, readable
  useEffect(() => {
    if (!graphReady || fittedRef.current) return
    if (graphData.nodes.length < 2) return
    fittedRef.current = true
    const t = window.setTimeout(() => fitMains(0), 80)
    return () => window.clearTimeout(t)
  }, [graphReady, graphData.nodes.length, fitMains])

  // Zoom INTO the cluster when expanded — single animation (no double-fire).
  useEffect(() => {
    if (!graphReady) return
    if (!focusHubId) {
      lastFocusRef.current = null
      return
    }
    const stamp = `${focusHubId}:${focusKey}`
    if (lastFocusRef.current === stamp) return
    lastFocusRef.current = stamp
    const id = focusHubId
    const t = window.setTimeout(() => zoomToCluster(id, 520), 140)
    return () => window.clearTimeout(t)
  }, [focusHubId, focusKey, graphReady, zoomToCluster])

  // Duck / Decro / Reset — one calm fit to mains
  useEffect(() => {
    if (!graphReady || !resetNonce) return
    lastFocusRef.current = null
    const t = window.setTimeout(() => fitMains(650), 40)
    return () => window.clearTimeout(t)
  }, [resetNonce, graphReady, fitMains])

  useEffect(() => {
    if (!graphReady || !highlightPostId) return
    const fg = getFg()
    if (!fg) return
    const node = graphData.nodes.find(
      (n) => n.id === highlightPostId || n.id === `p:${highlightPostId}`
    )
    if (!node || node.x == null || node.y == null) return
    nudgeToNode(node, 600)
    setSelectedId(node.id)
  }, [highlightPostId, graphData.nodes, graphReady, getFg, nudgeToNode])

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode
      if (n.kind !== 'hub') return
      const depth = n.depth ?? 1
      // LOD: when zoomed out, hide deep labels so mains stay readable
      if (globalScale < 0.85 && depth >= 2) return
      if (globalScale < 1.15 && depth >= 3) return

      const active = n.id === hoverId || n.id === selectedId
      const focused = Boolean(focusHubId && n.hubId === focusHubId)
      const x = n.x || 0
      const y = n.y || 0
      const hid = n.hubId
      const tourPulse =
        (tourStage === 'click-main' &&
          depth === 1 &&
          (!tourParentId || hid === tourParentId)) ||
        (tourStage === 'click-niche' && depth >= 2)

      const fontPx = hubFontPx(n, globalScale, focused || active)
      ctx.save()
      if (!focused && focusHubId && depth >= 2 && !active) {
        ctx.globalAlpha = 0.55
      }
      ctx.font = `400 ${fontPx}px "Space Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = (n.label || '').toUpperCase()
      const metrics = ctx.measureText(label)
      const padX = 7 / globalScale
      const padY = 5 / globalScale
      const tw = metrics.width + padX * 2
      const th = fontPx + padY * 2

      if (tourPulse) {
        const ring = 4 + pulse * 6
        ctx.strokeStyle = `rgba(0,0,0,${0.25 + pulse * 0.45})`
        ctx.lineWidth = 1.5 / globalScale
        ctx.strokeRect(
          x - tw / 2 - ring / globalScale,
          y - th / 2 - ring / globalScale,
          tw + (ring * 2) / globalScale,
          th + (ring * 2) / globalScale
        )
      }

      if (n.isBridge && !active) {
        ctx.fillStyle = '#000'
        ctx.fillRect(
          x - tw / 2 - 3 / globalScale,
          y - 2 / globalScale,
          2 / globalScale,
          4 / globalScale
        )
        ctx.fillRect(
          x - tw / 2 - 6 / globalScale,
          y - 2 / globalScale,
          2 / globalScale,
          4 / globalScale
        )
      }

      if (active || focused || (tourPulse && pulse > 0.55)) {
        ctx.fillStyle = '#000'
        ctx.fillRect(x - tw / 2, y - th / 2, tw, th)
        ctx.fillStyle = '#fff'
      } else {
        ctx.fillStyle = '#000'
      }
      ctx.fillText(label, x, y)
      ctx.restore()
    },
    [hoverId, selectedId, tourStage, tourParentId, pulse, focusHubId]
  )

  const handleClick = useCallback(
    (node: any) => {
      const n = node as GraphNode
      if (n.kind !== 'hub') return

      if (tourStage === 'welcome' || tourStage === 'guest') return

      const now = Date.now()
      const prev = lastClickRef.current
      const isDouble = Boolean(prev && prev.id === n.id && now - prev.at < 350)
      lastClickRef.current = { id: n.id, at: now }

      const hid = n.hubId || parseHubNodeId(n.id)
      if (!hid) return

      // Center Decro — collapse everything back to main groups
      if ((n.depth ?? 0) === 0) {
        setSelectedId(null)
        onNodeSelect?.(null)
        onResetView?.()
        return
      }

      setSelectedId(n.id)
      onNodeSelect?.(n)

      const hasKids = (n.childIds?.length || 0) > 0
      const unrevealedKids = (n.childIds || []).some((cid) => !revealedIds.has(cid))
      const kidsOpen = (n.childIds || []).some((cid) => revealedIds.has(cid))

      if (tourStage === 'click-main') {
        if ((n.depth ?? 0) !== 1) return
        onRevealChildren?.(hid)
        onTourMainOpened?.(hid)
        return
      }

      if (tourStage === 'click-niche') {
        if (isDouble && n.enterable && n.slug) {
          onTourNicheOpened?.(n.slug)
          return
        }
        if (unrevealedKids) {
          onRevealChildren?.(hid)
          return
        }
        if (n.enterable && n.slug) {
          onTourNicheOpened?.(n.slug)
        }
        return
      }

      // Normal: double-click enters; single-click expands / collapses
      if (isDouble && n.enterable && n.slug) {
        onEnterHub?.(n.slug)
        return
      }
      if (unrevealedKids) {
        onRevealChildren?.(hid)
        return
      }
      if (kidsOpen) {
        // Second click closes niches — keep camera still
        onCollapseChildren?.(hid)
        return
      }
      if (hasKids) {
        onRevealChildren?.(hid)
      }
    },
    [
      tourStage,
      onNodeSelect,
      onRevealChildren,
      onCollapseChildren,
      onResetView,
      onEnterHub,
      onTourMainOpened,
      onTourNicheOpened,
      revealedIds,
    ]
  )

  const handleBackgroundClick = useCallback(() => {
    if (tourStage && tourStage !== 'done' && tourStage !== 'guest') return
    setSelectedId(null)
    onNodeSelect?.(null)
  }, [onNodeSelect, tourStage])

  const persistPositions = useCallback(() => {
    for (const n of graphData.nodes) {
      if (n.x == null || n.y == null) continue
      if (n.depth === 0) continue
      posCache.current.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy })
    }
  }, [graphData.nodes])

  const showHint = !tourStage || tourStage === 'done'
  const canReset = revealedIds.size > startHubIds.length

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-3.5rem)] w-full bg-white overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {ForceGraph2D ? (
        <ForceGraph2D
          ref={(instance: any) => {
            fgRef.current = instance
            if (instance && typeof instance.zoom === 'function') {
              setGraphReady(true)
            } else {
              setGraphReady(false)
            }
          }}
          width={dims.w}
          height={dims.h}
          graphData={graphData}
          nodeId="id"
          linkSource="source"
          linkTarget="target"
          backgroundColor="#ffffff"
          linkColor={() => 'rgba(0,0,0,0.18)'}
          linkWidth={1}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(
            node: any,
            color: string,
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const n = node as GraphNode
            if (n.kind !== 'hub') return
            const depth = n.depth ?? 1
            if (globalScale < 0.85 && depth >= 2) return
            if (globalScale < 1.15 && depth >= 3) return
            const fontPx = hubFontPx(n, globalScale, false)
            const w = Math.max((n.label?.length || 4) * fontPx * 0.55, fontPx * 2)
            const h = fontPx * 1.4
            ctx.fillStyle = color
            ctx.fillRect((n.x || 0) - w / 2, (n.y || 0) - h / 2, w, h)
          }}
          onNodeHover={(node: any) => {
            const id = node?.id ?? null
            hoverIdRef.current = id
            setHoverId(id)
            if (containerRef.current) {
              containerRef.current.style.cursor = node ? 'pointer' : 'grab'
            }
          }}
          onNodeClick={handleClick}
          onBackgroundClick={handleBackgroundClick}
          onNodeDrag={(node: any) => {
            if (node.depth === 0) return
            node.fx = node.x
            node.fy = node.y
          }}
          onNodeDragEnd={(node: any) => {
            if (node.depth === 0) {
              node.fx = 0
              node.fy = 0
              return
            }
            node.fx = undefined
            node.fy = undefined
            persistPositions()
          }}
          onEngineTick={persistPositions}
          cooldownTicks={160}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.28}
          warmupTicks={50}
          enableNodeDrag={tourStage !== 'welcome'}
          enableZoomInteraction={false}
          enablePanInteraction={false}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center font-['Space_Mono'] text-xs text-black/40">
          Loading web…
        </div>
      )}

      {canReset && onResetView ? (
        <div className="absolute top-3 left-3 z-20 font-['Space_Mono']">
          <button
            type="button"
            onClick={() => {
              onResetView()
            }}
            className="border border-black bg-white px-3 py-2 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
          >
            ← Main groups
          </button>
        </div>
      ) : null}

      {/* Zoom controls — top-right so they stay clear of tour cards */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
        <div className="flex border border-black bg-white shadow-none">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => {
              const fg = getFg()
              if (!fg) return
              setZoomLevel((fg.zoom() || 1) / 1.3, 180)
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 text-2xl font-['Space_Mono'] leading-none hover:bg-black hover:text-white border-r border-black"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => {
              const fg = getFg()
              if (!fg) return
              setZoomLevel((fg.zoom() || 1) * 1.3, 180)
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 text-2xl font-['Space_Mono'] leading-none hover:bg-black hover:text-white border-r border-black"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Fit mains"
            onClick={() => fitMains(400)}
            className="px-3 h-11 sm:h-12 text-[10px] sm:text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-black hover:text-white"
          >
            Fit
          </button>
        </div>
        <p className="hidden sm:block text-[10px] font-['Space_Mono'] text-black/40 uppercase tracking-wide">
          {viewZoom.toFixed(1)}× · pinch or ⌘scroll
        </p>
        <button
          type="button"
          onClick={onUploadClick}
          className="sm:hidden border border-black bg-black text-white px-4 py-2.5 text-xs font-['Space_Mono'] uppercase"
        >
          Upload
        </button>
      </div>

      {showHint && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-['Space_Mono'] text-black/50 tracking-wide px-3 text-center max-w-[min(90vw,28rem)]">
          {PITCH_HINT}
        </p>
      )}
    </div>
  )
}
