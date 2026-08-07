import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'
import {
  allParentChildLinks,
  childrenOf,
  hubNodeId,
  hubSlug,
  PITCH_HUBS,
  startVisibleHubs,
} from '@/lib/pitch-taxonomy'

export const dynamic = 'force-dynamic'

export type PitchGraphNode = {
  id: string
  kind: 'hub' | 'post'
  label: string
  hubId?: string | null
  depth?: number
  parentIds?: string[]
  childIds?: string[]
  /** True when a real subgroup slug is resolved */
  enterable?: boolean
  isBridge?: boolean
  startVisible?: boolean
  imageUrl?: string | null
  audioUrl?: string | null
  videoUrl?: string | null
  contentType?: string | null
  subgroupId?: string | null
  /** @deprecated use hubId — kept for upload optimistic nodes */
  parentId?: string | null
  slug?: string | null
  description?: string | null
  username?: string | null
  pending?: boolean
  postCount?: number | null
  clientKey?: string
}

export type PitchGraphLink = {
  source: string
  target: string
}

export async function GET(request: Request) {
  if (!isPitchMode()) {
    return NextResponse.json({ error: 'Pitch mode is off' }, { status: 404 })
  }

  const limit = rateLimit(clientKey(request, 'pitch-graph'), {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return tooManyRequests(limit, 'Slow down')
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[pitch/graph] admin unavailable:', error?.message)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const slugs = [
    ...new Set(
      PITCH_HUBS.map((h) => hubSlug(h)).filter((s): s is string => Boolean(s))
    ),
  ]

  const { data: groups, error: gErr } = await admin
    .from('subgroups')
    .select('id,name,slug,post_count')
    .in('slug', slugs)

  if (gErr) {
    console.error('[pitch/graph] groups query failed:', gErr.message)
    return NextResponse.json({ error: 'Could not load graph' }, { status: 500 })
  }

  const bySlug = new Map((groups || []).map((g) => [g.slug, g]))

  const nodes: PitchGraphNode[] = PITCH_HUBS.map((h) => {
    const slug = hubSlug(h)
    const row = slug ? bySlug.get(slug) : undefined
    const kids = childrenOf(h.id)
    return {
      id: hubNodeId(h.id),
      kind: 'hub' as const,
      label: h.label,
      hubId: h.id,
      depth: h.depth,
      parentIds: h.parents,
      childIds: kids.map((c) => c.id),
      enterable: Boolean(row),
      isBridge: h.parents.length >= 2,
      startVisible: Boolean(
        h.startVisible || h.depth <= 1 || h.parents.length === 0
      ),
      slug: row?.slug ?? slug,
      subgroupId: row?.id ?? null,
      postCount:
        typeof row?.post_count === 'number'
          ? row.post_count
          : kids.length || 0,
    }
  })

  const links: PitchGraphLink[] = allParentChildLinks().map(({ parent, child }) => ({
    source: hubNodeId(child),
    target: hubNodeId(parent),
  }))

  const startIds = new Set(startVisibleHubs().map((h) => h.id))

  return NextResponse.json(
    {
      nodes,
      links,
      startHubIds: [...startIds],
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
      },
    }
  )
}
