/**
 * Real-time Comments Hook
 * Subscribes to live comment events on a post
 */

import { useEffect, useState } from 'react'
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
}

export function useRealtimeComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) return

    // Fetch initial comments
    const fetchComments = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.rpc('get_post_comments', {
          post_id_param: postId,
          page_size: 20,
          page_offset: 0
        })

        if (!error && data) {
          setComments(data)
          setCommentCount(data.length)
        }
      } catch (error) {
        console.error('Failed to fetch comments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchComments()

    // Subscribe to new comments
    const channel = supabase
      .channel(`post-${postId}-comments`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {
          // Fetch full comment data with user info
          const { data, error } = await supabase.rpc('get_post_comments', {
            post_id_param: postId,
            page_size: 1,
            page_offset: 0
          })

          if (!error && data && data.length > 0) {
            const newComment = data[0]
            setComments(prev => [newComment, ...prev])
            setCommentCount(prev => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
          setCommentCount(prev => Math.max(0, prev - 1))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          setComments(prev => 
            prev.map(c => c.id === payload.new.id ? {
              ...c,
              content: payload.new.content,
              updated_at: payload.new.updated_at,
              vote_score: payload.new.vote_score ?? c.vote_score,
              reply_count: payload.new.reply_count ?? c.reply_count,
            } : c)
          )
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [postId])

  return {
    comments,
    commentCount,
    loading,
    refetch: async () => {
      const { data, error } = await supabase.rpc('get_post_comments', {
        post_id_param: postId,
        page_size: 20,
        page_offset: 0
      })
      
      if (!error && data) {
        setComments(data)
        setCommentCount(data.length)
      }
    }
  }
}


