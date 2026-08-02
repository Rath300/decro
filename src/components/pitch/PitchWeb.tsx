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
import { PITCH_HINT } from '@/lib/pitch-copy'

type ForceGraphComponent = ComponentType<any>

type GraphNode = PitchGraphNode & {
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
  __img?: HTMLImageElement | null
  __imgFailed?: boolean
}

type Props = {
  nodes: PitchGraphNode[]
  links: PitchGraphLink[]
  highlightPostId?: string | null
  onUploadClick: () => void
  onNodeSelect?: (node: PitchGraphNode | null) => void
}

function hashSeed(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function typeMark(contentType?: string | null): string {
  if (!contentType) return '·'
  if (contentType === 'music') return '♪'
  if (contentType === 'video' || contentType === 'film') return '▶'
  if (contentType === 'text') return 'T'
  return '·'
}

function layoutKey(n: Pick<PitchGraphNode, 'id' | 'clientKey'>) {
  return n.clientKey || n.id
}

function hubFontPx(postCount: number | null | undefined, globalScale: number) {
  const n = Math.max(0, postCount ?? 0)
  const base = 11 + Math.min(11, Math.sqrt(n) * 1.8)
  return Math.max(base / globalScale, 4)
}

export default function PitchWeb({
  nodes,
  links,
  highlightPostId,
  onUploadClick,
  onNodeSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [ForceGraph2D, setForceGraph2D] = useState<ForceGraphComponent | null>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const imageCache = useRef(new Map<string, HTMLImageElement | null>())
  const posCache = useRef(
    new Map<string, { x: number; y: number; vx?: number; vy?: number }>()
  )

  // Load after mount so the imperative ref (zoom/centerAt) actually attaches.
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

  const graphData = useMemo(() => {
    const gNodes: GraphNode[] = nodes.map((n) => {
      const key = layoutKey(n)
      const cached = posCache.current.get(key)
      if (cached) return { ...n, ...cached }
      const seed = hashSeed(key)
      const angle = ((seed % 360) / 360) * Math.PI * 2
      const radius = 120 + (seed % 520)
      return {
        ...n,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
    return { nodes: gNodes, links: links.map((l) => ({ ...l })) }
  }, [nodes, links])

  useEffect(() => {
    if (!graphReady) return
    const fg = fgRef.current
    if (!fg) return

    fg.d3Force?.('charge')?.strength((node: GraphNode) => {
      if (node.kind !== 'subgroup') return -28
      const weight = Math.min(40, Math.sqrt(node.postCount ?? 0) * 4)
      return -100 - weight
    })
    fg.d3Force?.('charge')?.distanceMax?.(480)
    fg.d3Force?.('link')?.distance((link: any) => {
      const t = typeof link.target === 'object' ? link.target : null
      return t?.kind === 'subgroup' ? 72 : 48
    })
    fg.d3Force?.('link')?.strength?.(0.2)
    fg.d3Force?.('center')?.strength?.(0.03)
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

  const panByScreen = useCallback(
    (dx: number, dy: number) => {
      const fg = getFg()
      if (!fg) return
      const c = fg.centerAt()
      const k = fg.zoom() || 1
      if (!c || !Number.isFinite(c.x) || !Number.isFinite(c.y)) return
      fg.centerAt(c.x + dx / k, c.y + dy / k, 0)
    },
    [getFg]
  )

  const setZoomLevel = useCallback(
    (next: number, ms = 0) => {
      const fg = getFg()
      if (!fg) return
      fg.zoom(Math.min(6, Math.max(0.25, next)), ms)
    },
    [getFg]
  )

  // Two-finger scroll → pan; pinch/ctrl+scroll → zoom.
  useEffect(() => {
    if (!graphReady) return
    const el = containerRef.current
    if (!el) return

    let target: HTMLElement | null = null
    let raf = 0
    let cancelled = false

    const onWheel = (e: WheelEvent) => {
      const fg = getFg()
      if (!fg) return

      e.preventDefault()
      e.stopImmediatePropagation()

      if (e.ctrlKey || e.metaKey) {
        const k = fg.zoom() || 1
        setZoomLevel(k * Math.exp(-e.deltaY * 0.01))
        return
      }

      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 24 : 1
      panByScreen(e.deltaX * scale, e.deltaY * scale)
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
      // Also on the wrapper — some browsers target the parent.
      el.addEventListener('wheel', onWheel, { passive: false, capture: true })
    }
    bind()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      target?.removeEventListener('wheel', onWheel, true)
      el.removeEventListener('wheel', onWheel, true)
    }
  }, [graphReady, getFg, panByScreen, setZoomLevel])

  const nudgeZoom = useCallback(
    (factor: number) => {
      const fg = getFg()
      if (!fg) return
      const k = fg.zoom() || 1
      setZoomLevel(k * factor, 180)
    },
    [getFg, setZoomLevel]
  )

  useEffect(() => {
    if (!graphReady || !highlightPostId) return
    const fg = getFg()
    if (!fg) return
    const node = graphData.nodes.find(
      (n) => n.id === highlightPostId || n.id === `p:${highlightPostId}`
    )
    if (!node || node.x == null || node.y == null) return
    fg.centerAt(node.x, node.y, 900)
    fg.zoom(2.0, 900)
    setSelectedId(node.id)
  }, [highlightPostId, graphData.nodes, graphReady, getFg])

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode
      const isHub = n.kind === 'subgroup'
      const active = n.id === hoverId || n.id === selectedId
      const x = n.x || 0
      const y = n.y || 0

      ctx.save()
      if (n.pending) ctx.globalAlpha = 0.55

      if (isHub) {
        const fontPx = hubFontPx(n.postCount, globalScale)
        ctx.font = `400 ${fontPx}px "Space Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = (n.label || '').toUpperCase()
        if (active) {
          const metrics = ctx.measureText(label)
          const padX = 6 / globalScale
          const padY = 4 / globalScale
          const tw = metrics.width + padX * 2
          const th = fontPx + padY * 2
          ctx.fillStyle = '#000'
          ctx.fillRect(x - tw / 2, y - th / 2, tw, th)
          ctx.fillStyle = '#fff'
        } else {
          ctx.fillStyle = '#000'
        }
        ctx.fillText(label, x, y)
      } else {
        const size = 7 / Math.sqrt(globalScale)
        const s = size * 1.6
        ctx.lineWidth = active ? 2.5 / globalScale : 1 / globalScale
        ctx.strokeStyle = '#000'
        ctx.fillStyle = active ? '#000' : '#fff'
        if (n.pending) ctx.setLineDash([3 / globalScale, 3 / globalScale])
        ctx.fillRect(x - s / 2, y - s / 2, s, s)
        ctx.strokeRect(x - s / 2, y - s / 2, s, s)

        if (n.imageUrl && globalScale > 0.55 && !n.__imgFailed) {
          let img = imageCache.current.get(n.imageUrl)
          if (img === undefined) {
            img = null
            imageCache.current.set(n.imageUrl, null)
            const loaded = new Image()
            loaded.crossOrigin = 'anonymous'
            loaded.onload = () => {
              imageCache.current.set(n.imageUrl!, loaded)
            }
            loaded.onerror = () => {
              imageCache.current.set(n.imageUrl!, null)
              n.__imgFailed = true
            }
            loaded.src = n.imageUrl
          }
          if (img) {
            ctx.save()
            ctx.beginPath()
            ctx.rect(
              x - s / 2 + 1 / globalScale,
              y - s / 2 + 1 / globalScale,
              s - 2 / globalScale,
              s - 2 / globalScale
            )
            ctx.clip()
            ctx.drawImage(img, x - s / 2, y - s / 2, s, s)
            ctx.restore()
          } else {
            ctx.fillStyle = active ? '#fff' : '#000'
            ctx.font = `400 ${Math.max(9 / globalScale, 4)}px "Space Mono", monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(typeMark(n.contentType), x, y)
          }
        } else {
          ctx.fillStyle = active ? '#fff' : '#000'
          ctx.font = `400 ${Math.max(9 / globalScale, 4)}px "Space Mono", monospace`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(typeMark(n.contentType), x, y)
        }
      }
      ctx.restore()
    },
    [hoverId, selectedId]
  )

  const lastClickRef = useRef<{ id: string; at: number } | null>(null)

  const zoomToHubCluster = useCallback(
    (n: GraphNode) => {
      const fg = getFg()
      if (!fg || n.x == null || n.y == null) return
      const hubId = n.subgroupId
      const members = graphData.nodes.filter(
        (m) =>
          m.kind === 'post' && m.subgroupId === hubId && m.x != null && m.y != null
      )
      const xs = [n.x, ...members.map((m) => m.x!)]
      const ys = [n.y, ...members.map((m) => m.y!)]
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const span = Math.max(maxX - minX, maxY - minY, 80)
      const zoom = Math.min(2.8, Math.max(1.1, (Math.min(dims.w, dims.h) * 0.55) / span))
      fg.centerAt(cx, cy, 1000)
      fg.zoom(zoom, 1000)
    },
    [graphData.nodes, dims.w, dims.h, getFg]
  )

  const handleClick = useCallback(
    (node: any) => {
      const n = node as GraphNode
      const now = Date.now()
      const prev = lastClickRef.current
      const isDouble = prev && prev.id === n.id && now - prev.at < 350
      lastClickRef.current = { id: n.id, at: now }

      setSelectedId(n.id)
      onNodeSelect?.(n)

      if (n.kind === 'subgroup' && isDouble) {
        zoomToHubCluster(n)
      }
    },
    [onNodeSelect, zoomToHubCluster]
  )

  const handleBackgroundClick = useCallback(() => {
    setSelectedId(null)
    onNodeSelect?.(null)
  }, [onNodeSelect])

  const persistPositions = useCallback(() => {
    for (const n of graphData.nodes) {
      if (n.x == null || n.y == null) continue
      posCache.current.set(layoutKey(n), {
        x: n.x,
        y: n.y,
        vx: n.vx,
        vy: n.vy,
      })
    }
  }, [graphData.nodes])

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
          linkColor={() => 'rgba(0,0,0,0.16)'}
          linkWidth={1}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(
            node: any,
            color: string,
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const n = node as GraphNode
            if (n.kind === 'subgroup') {
              const fontPx = hubFontPx(n.postCount, globalScale)
              const w = Math.max((n.label?.length || 4) * fontPx * 0.55, fontPx * 2)
              const h = fontPx * 1.4
              ctx.fillStyle = color
              ctx.fillRect((n.x || 0) - w / 2, (n.y || 0) - h / 2, w, h)
              return
            }
            const size = 10 / Math.sqrt(globalScale)
            ctx.fillStyle = color
            ctx.fillRect((n.x || 0) - size, (n.y || 0) - size, size * 2, size * 2)
          }}
          onNodeHover={(node: any) => {
            setHoverId(node?.id ?? null)
            if (containerRef.current) {
              containerRef.current.style.cursor = node ? 'pointer' : 'grab'
            }
          }}
          onNodeClick={handleClick}
          onBackgroundClick={handleBackgroundClick}
          onNodeDrag={(node: any) => {
            node.fx = node.x
            node.fy = node.y
          }}
          onNodeDragEnd={(node: any) => {
            node.fx = undefined
            node.fy = undefined
            persistPositions()
          }}
          onEngineTick={persistPositions}
          cooldownTicks={Infinity}
          d3AlphaDecay={0.014}
          d3VelocityDecay={0.16}
          warmupTicks={60}
          enableNodeDrag={true}
          enableZoomInteraction={false}
          enablePanInteraction={true}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center font-['Space_Mono'] text-xs text-black/40">
          Loading web…
        </div>
      )}

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <div className="flex border border-black bg-white">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => nudgeZoom(1 / 1.25)}
            className="w-9 h-9 text-lg font-['Space_Mono'] leading-none hover:bg-black hover:text-white border-r border-black"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => nudgeZoom(1.25)}
            className="w-9 h-9 text-lg font-['Space_Mono'] leading-none hover:bg-black hover:text-white"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          className="sm:hidden border border-black bg-black text-white px-4 py-2 text-xs font-['Space_Mono'] uppercase"
        >
          Upload
        </button>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-['Space_Mono'] text-black/50 tracking-wide">
        {PITCH_HINT}
      </p>
    </div>
  )
}
