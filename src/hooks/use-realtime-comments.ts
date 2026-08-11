/**
 * Real-time Comments Hook
 * Subscribes to live comment events on a post
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import supabase from '@/lib/supabase-client'

export interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  vote_score?: number
  reply_count?: number
  parent_id?: string | null
}

function dedupeById(list: Comment[]): Comment[] {
  const seen = new Set<string>()
  const out: Comment[] = []
  for (const c of list) {
    if (!c?.id || seen.has(c.id)) continue
    seen.add(c.id)
    out.push(c)
  }
  return out
}

export function useRealtimeComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const postIdRef = useRef(postId)
  postIdRef.current = postId

  const fetchComments = useCallback(async (opts?: { silent?: boolean }) => {
    if (!postId) return
    if (!opts?.silent) setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_post_comments', {
        post_id_param: postId,
        page_size: 20,
        page_offset: 0,
      })

      if (error) {
        console.error('Failed to fetch comments RPC error:', error)
        setComments([])
        setCommentCount(0)
      } else if (data) {
        const next = dedupeById(data as Comment[])
        setComments(next)
        setCommentCount(next.length)
      } else {
        setComments([])
        setCommentCount(0)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      setComments([])
      setCommentCount(0)
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    if (!postId) return

    void fetchComments()

    // On any change, refetch once — avoids duplicate prepend races with
    // refreshSignal + postgres_changes both firing after submit.
    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          if (postIdRef.current !== postId) return
          void fetchComments({ silent: true })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [postId, fetchComments])

  const refetch = useCallback(async () => {
    await fetchComments({ silent: true })
  }, [fetchComments])

  return {
    comments,
    commentCount,
    loading,
    refetch,
  }
}
