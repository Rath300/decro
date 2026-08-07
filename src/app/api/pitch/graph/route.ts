import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'
import {
  getPitchParent,
  parentGenreSlugs,
  parentNodeId,
  PITCH_PARENTS,
} from '@/lib/pitch-taxonomy'

export const dynamic = 'force-dynamic'

const MAX_POSTS_EXPANDED = 120

export type PitchGraphNode = {
  id: string
  kind: 'parent' | 'subgroup' | 'post'
  label: string
  imageUrl?: string | null
  audioUrl?: string | null
  videoUrl?: string | null
  contentType?: string | null
  subgroupId?: string | null
  parentId?: string | null
  slug?: string | null
  description?: string | null
  username?: string | null
  pending?: boolean
  postCount?: number | null
  /** Stable client id so layout can survive optimistic → real id swaps */
  clientKey?: string
}

export type PitchGraphLink = {
  source: string
  target: string
}

function displayUsername(raw?: string | null) {
  if (!raw || /^anonymous(_|$)/i.test(raw)) return 'anonymous'
  return raw
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

  const url = new URL(request.url)
  const parentParam = url.searchParams.get('parent')
  const parent = parentParam ? getPitchParent(parentParam) : null

  if (parentParam && !parent) {
    return NextResponse.json({ error: 'Unknown parent group' }, { status: 400 })
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[pitch/graph] admin unavailable:', error?.message)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Top level: sparse constellation of curated parent hubs only.
  if (!parent) {
    const nodes: PitchGraphNode[] = PITCH_PARENTS.map((p) => ({
      id: parentNodeId(p.id),
      kind: 'parent' as const,
      label: p.label,
      parentId: p.id,
      postCount: p.genres.length,
    }))
    return NextResponse.json(
      { nodes, links: [] as PitchGraphLink[], level: 'mains', parent: null },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    )
  }

  const slugs = parentGenreSlugs(parent)
  const { data: groups, error: gErr } = await admin
    .from('subgroups')
    .select('id,name,slug,post_count')
    .in('slug', slugs)

  if (gErr) {
    console.error('[pitch/graph] groups query failed:', gErr.message)
    return NextResponse.json({ error: 'Could not load graph' }, { status: 500 })
  }

  const groupRows = groups || []
  const bySlug = new Map(groupRows.map((g) => [g.slug, g]))
  // Preserve taxonomy order; skip genres that were never seeded.
  const orderedGroups = slugs
    .map((slug) => bySlug.get(slug))
    .filter((g): g is NonNullable<typeof g> => Boolean(g))

  const parentId = parentNodeId(parent.id)
  const nodes: PitchGraphNode[] = [
    {
      id: parentId,
      kind: 'parent',
      label: parent.label,
      parentId: parent.id,
      postCount: orderedGroups.length,
    },
  ]
  const links: PitchGraphLink[] = []
  const seenGroups = new Set<string>()

  for (const g of orderedGroups) {
    if (seenGroups.has(g.id)) continue
    seenGroups.add(g.id)
    const gid = `g:${g.id}`
    nodes.push({
      id: gid,
      kind: 'subgroup',
      label: g.name,
      slug: g.slug,
      subgroupId: g.id,
      parentId: parent.id,
      postCount: typeof g.post_count === 'number' ? g.post_count : Number(g.post_count) || 0,
    })
    links.push({ source: gid, target: parentId })
  }

  const groupIds = [...seenGroups]
  let postRows: any[] = []
  if (groupIds.length) {
    const { data: posts, error: pErr } = await admin
      .from('posts')
      .select(
        'id,title,description,content_type,media_url,audio_url,video_url,subgroup_id,created_at, profiles!posts_creator_id_fkey(username)'
      )
      .in('subgroup_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(MAX_POSTS_EXPANDED)

    if (pErr) {
      console.error('[pitch/graph] posts query failed:', pErr.message)
      return NextResponse.json({ error: 'Could not load graph' }, { status: 500 })
    }
    postRows = posts || []
  }

  for (const p of postRows) {
    if (!p.subgroup_id || !seenGroups.has(p.subgroup_id)) continue
    const id = `p:${p.id}`
    const profile = Array.isArray((p as any).profiles)
      ? (p as any).profiles[0]
      : (p as any).profiles
    nodes.push({
      id,
      kind: 'post',
      label: p.title || 'Untitled',
      description: p.description || null,
      username: displayUsername(profile?.username),
      imageUrl: p.media_url,
      audioUrl: p.audio_url,
      videoUrl: p.video_url,
      contentType: p.content_type,
      subgroupId: p.subgroup_id,
      parentId: parent.id,
    })
    links.push({ source: id, target: `g:${p.subgroup_id}` })
  }

  // Also keep other mains dimmed in the payload so expand feels continuous.
  for (const p of PITCH_PARENTS) {
    if (p.id === parent.id) continue
    nodes.push({
      id: parentNodeId(p.id),
      kind: 'parent',
      label: p.label,
      parentId: p.id,
      postCount: p.genres.length,
    })
  }

  return NextResponse.json(
    { nodes, links, level: 'expanded', parent: parent.id },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
      },
    }
  )
}
