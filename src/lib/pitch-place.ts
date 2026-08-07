/**
 * Place a newly created subgroup onto the pitch web using free local cosine.
 * Niche depth is structural: child of best match(es), not similarity magnitude.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getPitchHub,
  hubSlug,
  PITCH_HUBS,
  userHubId,
} from '@/lib/pitch-taxonomy'
import { cosine, vectorize, type SparseVec } from '@/lib/pitch-token-vector'

const SCORE_THRESHOLD = 0.18
const BRIDGE_RATIO = 0.8
const MAX_DEPTH = 4
const FALLBACK_PARENT = 'visual-art'

export type PlaceableHub = {
  hubId: string
  label: string
  depth: number
  /** Root main under Decro (for bridge detection) */
  rootMain: string
  aliases?: string[]
  /** Skip matching against self when re-placing */
  subgroupId?: string
}

export type PlacementResult = {
  parentHubIds: string[]
  scores: number[]
  depth: number
  labels: string[]
  lowConfidence: boolean
}

function rootMainOf(hubId: string): string {
  let cur = getPitchHub(hubId)
  if (!cur) return hubId
  const seen = new Set<string>()
  while (cur && cur.depth > 1 && cur.parents[0] && !seen.has(cur.id)) {
    seen.add(cur.id)
    const next = getPitchHub(cur.parents[0])
    if (!next) break
    cur = next
  }
  if (cur && cur.depth === 1) return cur.id
  if (cur?.parents?.[0] && cur.parents[0] !== 'decro') return cur.parents[0]
  return cur?.id || hubId
}

export function taxonomyPlaceables(): PlaceableHub[] {
  return PITCH_HUBS.filter((h) => h.depth >= 1).map((h) => ({
    hubId: h.id,
    label: h.label,
    depth: h.depth,
    rootMain: rootMainOf(h.id),
    aliases: h.aliases,
  }))
}

/** Taxonomy hub ids whose seeded slug matches — already on the curated web. */
export function taxonomySlugs(): Set<string> {
  const set = new Set<string>()
  for (const h of PITCH_HUBS) {
    const s = hubSlug(h)
    if (s) set.add(s)
  }
  return set
}

export function chooseParents(
  name: string,
  description: string | null | undefined,
  candidates: PlaceableHub[]
): PlacementResult {
  const query = vectorize(`${name} ${description || ''}`)
  const scored = candidates
    .map((c) => {
      const vec = vectorize(`${c.label}`, c.aliases || [])
      return { c, score: cosine(query, vec) }
    })
    .sort((a, b) => b.score - a.score)

  const mains = scored.filter((s) => s.c.depth === 1)
  let primary = scored.find((s) => s.score >= SCORE_THRESHOLD)
  let lowConfidence = false

  if (!primary) {
    lowConfidence = true
    primary = mains[0] || scored[0]
    if (!primary || primary.score < 0.06) {
      const fb = candidates.find((c) => c.hubId === FALLBACK_PARENT)
      if (fb) {
        return {
          parentHubIds: [FALLBACK_PARENT],
          scores: [0],
          depth: Math.min(MAX_DEPTH, fb.depth + 1),
          labels: [fb.label],
          lowConfidence: true,
        }
      }
    }
  }

  if (!primary) {
    return {
      parentHubIds: [FALLBACK_PARENT],
      scores: [0],
      depth: 2,
      labels: ['Visual Art'],
      lowConfidence: true,
    }
  }

  const parents: { hubId: string; score: number; label: string; depth: number }[] =
    [
      {
        hubId: primary.c.hubId,
        score: primary.score,
        label: primary.c.label,
        depth: primary.c.depth,
      },
    ]

  const second = scored.find(
    (s) =>
      s.c.hubId !== primary!.c.hubId &&
      s.score >= primary!.score * BRIDGE_RATIO &&
      s.score >= SCORE_THRESHOLD &&
      s.c.rootMain !== primary!.c.rootMain
  )
  if (second) {
    parents.push({
      hubId: second.c.hubId,
      score: second.score,
      label: second.c.label,
      depth: second.c.depth,
    })
  }

  // Never attach directly under center
  const cleaned = parents.filter((p) => p.hubId !== 'decro')
  if (!cleaned.length) {
    return {
      parentHubIds: [FALLBACK_PARENT],
      scores: [0],
      depth: 2,
      labels: ['Visual Art'],
      lowConfidence: true,
    }
  }

  const depth = Math.min(
    MAX_DEPTH,
    Math.max(...cleaned.map((p) => p.depth)) + 1
  )

  return {
    parentHubIds: cleaned.map((p) => p.hubId),
    scores: cleaned.map((p) => p.score),
    depth,
    labels: cleaned.map((p) => p.label),
    lowConfidence,
  }
}

export async function loadPlacedUserCandidates(
  admin: SupabaseClient,
  excludeSubgroupId?: string
): Promise<PlaceableHub[]> {
  const { data, error } = await admin
    .from('subgroups')
    .select('id,name,web_depth')
    .not('placed_at', 'is', null)
    .limit(500)

  if (error) {
    console.error('[pitch-place] load placed failed:', error.message)
    return []
  }

  return (data || [])
    .filter((row) => row.id !== excludeSubgroupId)
    .map((row) => {
      const depth =
        typeof row.web_depth === 'number' && row.web_depth > 0
          ? row.web_depth
          : 2
      return {
        hubId: userHubId(row.id),
        label: row.name,
        depth,
        rootMain: FALLBACK_PARENT,
        subgroupId: row.id,
      }
    })
}

export async function placeSubgroupOnWeb(
  admin: SupabaseClient,
  opts: {
    id: string
    name: string
    description?: string | null
    slug?: string | null
  }
): Promise<PlacementResult | null> {
  const slugs = taxonomySlugs()
  if (opts.slug && slugs.has(opts.slug)) {
    // Already represented by a curated hub — don't duplicate on the web.
    return null
  }

  const candidates = [
    ...taxonomyPlaceables(),
    ...(await loadPlacedUserCandidates(admin, opts.id)),
  ]

  const placement = chooseParents(opts.name, opts.description, candidates)

  // Replace any existing edges (idempotent re-place)
  await admin.from('subgroup_parents').delete().eq('child_id', opts.id)

  const rows = placement.parentHubIds.map((parentHubId, i) => ({
    child_id: opts.id,
    parent_hub_id: parentHubId,
    rank: i + 1,
    score: placement.scores[i] ?? null,
  }))

  const { error: edgeErr } = await admin.from('subgroup_parents').insert(rows)
  if (edgeErr) {
    console.error('[pitch-place] insert edges failed:', edgeErr.message)
    throw new Error(edgeErr.message)
  }

  const { error: updErr } = await admin
    .from('subgroups')
    .update({
      web_depth: placement.depth,
      placed_at: new Date().toISOString(),
    })
    .eq('id', opts.id)

  if (updErr) {
    console.error('[pitch-place] update subgroup failed:', updErr.message)
    throw new Error(updErr.message)
  }

  return placement
}

/** Exported for tests / scripts without DB. */
export function scoreQueryAgainstHub(
  name: string,
  description: string,
  hub: PlaceableHub
): number {
  const q = vectorize(`${name} ${description}`)
  const v = vectorize(hub.label, hub.aliases || [])
  return cosine(q, v)
}

export type { SparseVec }
