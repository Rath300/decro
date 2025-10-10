/**
 * Real-time Likes Hook
 * Subscribes to live like/unlike events on a post
 */

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'

export function useRealtimeLikes(postId: string, initialCount = 0) {
  const [likeCount, setLikeCount] = useState(initialCount)

  useEffect(() => {
    if (!postId) return

    // Fetch current count
    const fetchCount = async () => {
      const { data, error } = await supabase.rpc('get_like_count', {
        post_id_param: postId
      })
      
      if (!error && data !== null) {
        setLikeCount(data)
      }
    }

    fetchCount()

    // Subscribe to changes
    const channel = supabase
      .channel(`post-${postId}-likes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`
        },
        () => {
          setLikeCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`
        },
        () => {
          setLikeCount(prev => Math.max(0, prev - 1))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [postId])

  return likeCount
}


