/**
 * Instant navigation helpers for pitch mode — seed UI + prefetch routes.
 */

export type PostNavSeed = {
  id: string
  title: string
  description?: string | null
  content_type?: string
  media_url?: string | null
  audio_url?: string | null
  video_url?: string | null
  created_at?: string
  views?: number
  creator_id?: string
  creator_username?: string | null
  subgroup_id?: string | null
  subgroup_name?: string | null
  subgroup_slug?: string | null
}

function seedKey(postId: string) {
  return `decro_post_seed_${postId}`
}

export function seedPostOpen(post: PostNavSeed) {
  try {
    sessionStorage.setItem(seedKey(post.id), JSON.stringify(post))
  } catch {
    /* ignore */
  }
}

export function takePostSeed(postId: string): PostNavSeed | null {
  try {
    const raw = sessionStorage.getItem(seedKey(postId))
    if (!raw) return null
    sessionStorage.removeItem(seedKey(postId))
    return JSON.parse(raw) as PostNavSeed
  } catch {
    return null
  }
}

export function postIdFromGraphNodeId(nodeId: string): string {
  return nodeId.startsWith('p:') ? nodeId.slice(2) : nodeId
}
