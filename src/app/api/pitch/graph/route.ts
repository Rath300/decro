import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'
import {
  allParentChildLinks,
  childrenOf,
  getPitchHub,
  hubNodeId,
  hubSlug,
  isUserHubId,
  PITCH_HUBS,
  startVisibleHubs,
  userHubId,
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
  /** True when this hub was placed via free local cosine (not curated taxonomy) */
  userPlaced?: boolean
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

  const [groupsRes, placedRes, edgesRes] = await Promise.all([
    admin.from('subgroups').select('id,name,slug,post_count').in('slug', slugs),
    admin
      .from('subgroups')
      .select('id,name,slug,description,post_count,web_depth,placed_at')
      .not('placed_at', 'is', null)
      .limit(800),
    admin.from('subgroup_parents').select('child_id,parent_hub_id,rank').limit(2000),
  ])

  if (groupsRes.error) {
    console.error('[pitch/graph] groups query failed:', groupsRes.error.message)
    return NextResponse.json({ error: 'Could not load graph' }, { status: 500 })
  }

  // Tables may not exist yet before migration — degrade gracefully.
  const placedOk = !placedRes.error
  const edgesOk = !edgesRes.error
  if (placedRes.error) {
    console.warn('[pitch/graph] placed groups:', placedRes.error.message)
  }
  if (edgesRes.error) {
    console.warn('[pitch/graph] parent edges:', edgesRes.error.message)
  }

  const bySlug = new Map(
    (groupsRes.data || []).map((g) => [g.slug, g as {
      id: string
      name: string
      slug: string
      post_count: number | null
    }])
  )

  // Every taxonomy hub (except Decro center) is a real room. Create any
  // missing subgroups so bridges/mains like Night Street get Enter/Upload.
  const missingHubs = PITCH_HUBS.filter((h) => {
    const slug = hubSlug(h)
    return Boolean(slug) && !bySlug.has(slug!)
  })
  if (missingHubs.length > 0) {
    await admin.rpc('upsert_profile_from_external', {
      external_id_param: 'pitch:seed',
      username_param: 'decro_seed',
      full_name_param: 'Decro Seed',
    })
    for (const h of missingHubs) {
      const slug = hubSlug(h)
      if (!slug) continue
      const { data, error } = await admin.rpc('create_subgroup_ext', {
        external_id_param: 'pitch:seed',
        name_param: h.label,
        slug_param: slug,
        description_param: null,
        cover_image_url_param: null,
      })
      if (error) {
        console.warn(`[pitch/graph] ensure ${slug}:`, error.message)
        continue
      }
      const result = data as { success?: boolean; id?: string; slug?: string } | null
      if (result?.success && result.id) {
        bySlug.set(result.slug || slug, {
          id: result.id,
          name: h.label,
          slug: result.slug || slug,
          post_count: 0,
        })
      } else {
        // Race / already taken — re-read
        const { data: existing } = await admin
          .from('subgroups')
          .select('id,name,slug,post_count')
          .eq('slug', slug)
          .maybeSingle()
        if (existing) bySlug.set(slug, existing)
      }
    }
  }

  const taxonomyChildIds = new Map<string, string[]>()
  for (const h of PITCH_HUBS) {
    taxonomyChildIds.set(
      h.id,
      childrenOf(h.id).map((c) => c.id)
    )
  }

  const edges = edgesOk ? edgesRes.data || [] : []
  const placed = placedOk ? placedRes.data || [] : []
  const placedById = new Map(placed.map((p) => [p.id, p]))

  // parent_hub_id -> child user hub ids
  const dbChildren = new Map<string, string[]>()
  // child subgroup uuid -> parent hub ids
  const dbParents = new Map<string, string[]>()
  for (const e of edges) {
    if (!placedById.has(e.child_id)) continue
    const childHub = userHubId(e.child_id)
    const list = dbChildren.get(e.parent_hub_id) || []
    list.push(childHub)
    dbChildren.set(e.parent_hub_id, list)
    const parents = dbParents.get(e.child_id) || []
    parents.push(e.parent_hub_id)
    dbParents.set(e.child_id, parents)
  }

  const mergeKids = (hubId: string, curated: string[]): string[] => {
    const extra = dbChildren.get(hubId) || []
    if (!extra.length) return curated
    return [...new Set([...curated, ...extra])]
  }

  const nodes: PitchGraphNode[] = PITCH_HUBS.map((h) => {
    const slug = hubSlug(h)
    const row = slug ? bySlug.get(slug) : undefined
    const kids = mergeKids(h.id, taxonomyChildIds.get(h.id) || [])
    return {
      id: hubNodeId(h.id),
      kind: 'hub' as const,
      label: h.label,
      hubId: h.id,
      depth: h.depth,
      parentIds: h.parents,
      childIds: kids,
      // Center is not a room; everything else is enterable once slug resolves.
      enterable: Boolean(slug && row),
      isBridge: h.parents.length >= 2,
      startVisible: Boolean(
        h.startVisible || h.depth <= 1 || h.parents.length === 0
      ),
      slug: row?.slug ?? slug,
      subgroupId: row?.id ?? null,
      postCount:
        typeof row?.post_count === 'number'
          ? row.post_count
          : 0,
    }
  })

  const links: PitchGraphLink[] = allParentChildLinks().map(({ parent, child }) => ({
    source: hubNodeId(child),
    target: hubNodeId(parent),
  }))

  // User-placed hubs (organic subgroups)
  for (const row of placed) {
    const parents = dbParents.get(row.id) || []
    if (!parents.length) continue
    // Skip if this slug is already a curated enterable hub
    if (row.slug && bySlug.has(row.slug)) continue

    const hubId = userHubId(row.id)
    const depth =
      typeof row.web_depth === 'number' && row.web_depth > 0
        ? row.web_depth
        : Math.min(
            4,
            Math.max(
              ...parents.map((p) => getPitchHub(p)?.depth ?? (isUserHubId(p) ? 2 : 1)),
              1
            ) + 1
          )
    const kids = mergeKids(hubId, [])
    nodes.push({
      id: hubNodeId(hubId),
      kind: 'hub',
      label: row.name,
      hubId,
      depth,
      parentIds: parents,
      childIds: kids,
      enterable: true,
      isBridge: parents.length >= 2,
      startVisible: false,
      slug: row.slug,
      subgroupId: row.id,
      description: row.description,
      postCount: typeof row.post_count === 'number' ? row.post_count : 0,
      userPlaced: true,
    })

    for (const p of parents) {
      links.push({
        source: hubNodeId(hubId),
        target: hubNodeId(p),
      })
    }
  }

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
