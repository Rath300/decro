import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'

export const dynamic = 'force-dynamic'

const MAX_POSTS = 250
const MAX_GROUPS = 150

export type PitchGraphNode = {
  id: string
  kind: 'subgroup' | 'post'
  label: string
  imageUrl?: string | null
  audioUrl?: string | null
  videoUrl?: string | null
  contentType?: string | null
  subgroupId?: string | null
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

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[pitch/graph] admin unavailable:', error?.message)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const [{ data: groups, error: gErr }, { data: posts, error: pErr }] =
    await Promise.all([
      admin
        .from('subgroups')
        .select('id,name,slug,post_count')
        .order('post_count', { ascending: false })
        .limit(MAX_GROUPS),
      admin
        .from('posts')
        .select(
          'id,title,description,content_type,media_url,audio_url,video_url,subgroup_id,created_at, profiles!posts_creator_id_fkey(username)'
        )
        .not('subgroup_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAX_POSTS),
    ])

  if (gErr || pErr) {
    console.error('[pitch/graph] query failed:', gErr?.message || pErr?.message)
    return NextResponse.json({ error: 'Could not load graph' }, { status: 500 })
  }

  const groupRows = groups || []
  const postRows = (posts || []).filter((p) => p.subgroup_id)

  const groupIds = new Set(groupRows.map((g) => g.id))
  for (const p of postRows) {
    if (p.subgroup_id) groupIds.add(p.subgroup_id)
  }

  const missing = [...groupIds].filter((id) => !groupRows.some((g) => g.id === id))
  let extraGroups: typeof groupRows = []
  if (missing.length) {
    const { data } = await admin
      .from('subgroups')
      .select('id,name,slug,post_count')
      .in('id', missing.slice(0, 80))
    extraGroups = data || []
  }

  const allGroups = [...groupRows, ...extraGroups]
  const seen = new Set<string>()
  const nodes: PitchGraphNode[] = []

  for (const g of allGroups) {
    if (seen.has(g.id)) continue
    seen.add(g.id)
    nodes.push({
      id: `g:${g.id}`,
      kind: 'subgroup',
      label: g.name,
      slug: g.slug,
      subgroupId: g.id,
      postCount: typeof g.post_count === 'number' ? g.post_count : Number(g.post_count) || 0,
    })
  }

  const links: PitchGraphLink[] = []
  for (const p of postRows) {
    if (!p.subgroup_id || !seen.has(p.subgroup_id)) continue
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
    })
    links.push({ source: id, target: `g:${p.subgroup_id}` })
  }

  return NextResponse.json(
    { nodes, links },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=30',
      },
    }
  )
}
