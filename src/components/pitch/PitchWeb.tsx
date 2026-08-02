'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { PitchGraphLink, PitchGraphNode } from '@/app/api/pitch/graph/route'
import { PITCH_HINT } from '@/lib/pitch-copy'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
}) as any

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

export default function PitchWeb({
  nodes,
  links,
  highlightPostId,
  onUploadClick,
  onNodeSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const imageCache = useRef(new Map<string, HTMLImageElement | null>())

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
      const seed = hashSeed(n.id)
      const angle = ((seed % 360) / 360) * Math.PI * 2
      const radius = 80 + (seed % 420)
      return {
        ...n,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
    return { nodes: gNodes, links: links.map((l) => ({ ...l })) }
  }, [nodes, links])

  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    // Heavier hubs, posts orbit.
    fg.d3Force('charge')?.strength((node: GraphNode) =>
      node.kind === 'subgroup' ? -180 : -40
    )
    fg.d3Force('link')?.distance((link: any) => {
      const t = typeof link.target === 'object' ? link.target : null
      return t?.kind === 'subgroup' ? 48 : 36
    })
    fg.d3ReheatSimulation()
  }, [graphData])

  useEffect(() => {
    if (!highlightPostId || !fgRef.current) return
    const node = graphData.nodes.find((n) => n.id === `p:${highlightPostId}`)
    if (!node || node.x == null || node.y == null) return
    // Brief reheat so neighbors make room for the new post.
    fgRef.current.d3ReheatSimulation()
    fgRef.current.centerAt(node.x, node.y, 600)
    fgRef.current.zoom(2.2, 600)
    setSelectedId(node.id)
  }, [highlightPostId, graphData.nodes])

  // Light residual drift after the initial settle — alive, not screensaver-y.
  useEffect(() => {
    const id = window.setInterval(() => {
      fgRef.current?.d3ReheatSimulation?.()
    }, 10_000)
    return () => window.clearInterval(id)
  }, [])

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode
      const isHub = n.kind === 'subgroup'
      const size = isHub ? 14 / Math.sqrt(globalScale) : 7 / Math.sqrt(globalScale)
      const active = n.id === hoverId || n.id === selectedId
      const x = n.x || 0
      const y = n.y || 0

      ctx.save()
      ctx.lineWidth = active ? 2.5 / globalScale : 1 / globalScale
      ctx.strokeStyle = '#000'
      ctx.fillStyle = active ? '#000' : '#fff'

      if (isHub) {
        const w = Math.max(size * 3.2, (n.label?.length || 4) * (5.2 / globalScale))
        const h = size * 1.6
        ctx.fillRect(x - w / 2, y - h / 2, w, h)
        ctx.strokeRect(x - w / 2, y - h / 2, w, h)
        ctx.fillStyle = active ? '#fff' : '#000'
        ctx.font = `700 ${Math.max(8 / globalScale, 3)}px "Space Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = (n.label || '').toUpperCase().slice(0, 18)
        ctx.fillText(label, x, y)
      } else {
        const s = size * 1.6
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
            ctx.rect(x - s / 2 + 1 / globalScale, y - s / 2 + 1 / globalScale, s - 2 / globalScale, s - 2 / globalScale)
            ctx.clip()
            ctx.drawImage(img, x - s / 2, y - s / 2, s, s)
            ctx.restore()
          } else {
            ctx.fillStyle = active ? '#fff' : '#000'
            ctx.font = `700 ${Math.max(9 / globalScale, 4)}px "Space Mono", monospace`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(typeMark(n.contentType), x, y)
          }
        } else {
          ctx.fillStyle = active ? '#fff' : '#000'
          ctx.font = `700 ${Math.max(9 / globalScale, 4)}px "Space Mono", monospace`
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

  const zoomToHubCluster = useCallback((n: GraphNode) => {
    const fg = fgRef.current
    if (!fg || n.x == null || n.y == null) return
    const hubId = n.subgroupId
    const members = graphData.nodes.filter(
      (m) => m.kind === 'post' && m.subgroupId === hubId && m.x != null && m.y != null
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
    const zoom = Math.min(3.2, Math.max(1.2, (Math.min(dims.w, dims.h) * 0.55) / span))
    fg.centerAt(cx, cy, 750)
    fg.zoom(zoom, 750)
  }, [graphData.nodes, dims.w, dims.h])

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

  return (
    <div ref={containerRef} className="relative h-[calc(100dvh-3.5rem)] w-full bg-white overflow-hidden">
      <ForceGraph2D
        ref={fgRef}
        width={dims.w}
        height={dims.h}
        graphData={graphData}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        backgroundColor="#ffffff"
        linkColor={() => 'rgba(0,0,0,0.22)'}
        linkWidth={1}
        nodeCanvasObject={paintNode}
        nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const n = node as GraphNode
          const isHub = n.kind === 'subgroup'
          const size = isHub ? 18 / Math.sqrt(globalScale) : 10 / Math.sqrt(globalScale)
          ctx.fillStyle = color
          ctx.fillRect((n.x || 0) - size, (n.y || 0) - size, size * 2, size * 2)
        }}
        onNodeHover={(node: any) => setHoverId(node?.id ?? null)}
        onNodeClick={handleClick}
        onBackgroundClick={handleBackgroundClick}
        onNodeDragEnd={(node: any) => {
          node.fx = node.x
          node.fy = node.y
        }}
        cooldownTicks={120}
        d3AlphaDecay={0.022}
        d3VelocityDecay={0.3}
        warmupTicks={40}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />

      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-['Space_Mono'] text-black/50 tracking-wide">
        {PITCH_HINT}
      </p>

      <button
        type="button"
        onClick={onUploadClick}
        className="absolute bottom-4 right-4 sm:hidden border border-black bg-black text-white px-4 py-2 text-xs font-['Space_Mono'] uppercase"
      >
        Upload
      </button>
    </div>
  )
}
