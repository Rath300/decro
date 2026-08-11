/**
 * Post Statistics Component
 * Shows views, likes, and comments count on posts
 */

'use client'

import { useRealtimeLikes } from '@/hooks/use-realtime-likes'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'

interface PostStatsProps {
  postId: string
  initialViews?: number
  initialLikes?: number
  initialComments?: number
  showDetailed?: boolean
}

export function PostStats({ 
  postId, 
  initialViews = 0, 
  initialLikes = 0,
  initialComments = 0,
  showDetailed = false 
}: PostStatsProps) {
  const likeCount = useRealtimeLikes(postId, initialLikes)
  const [views, setViews] = useState(initialViews)
  const [commentCount, setCommentCount] = useState(initialComments)

  useEffect(() => {
    if (!postId) return

    // Fetch latest stats
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('views')
          .eq('id', postId)
          .maybeSingle()

        if (!error && data) {
          setViews(data.views || 0)
        } else if (error) {
          console.warn('Failed to fetch views:', error)
          setViews(initialViews)
        }

        // Get comment count
        const { data: commentsData, error: commentsError } = await supabase.rpc('get_comment_count', {
          post_id_param: postId
        })

        if (!commentsError && commentsData !== null && commentsData !== undefined) {
          setCommentCount(commentsData)
        } else if (commentsError) {
          console.warn('Failed to fetch comment count:', commentsError)
          setCommentCount(initialComments)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setViews(initialViews)
        setCommentCount(initialComments)
      }
    }

    fetchStats()

    // Subscribe to view updates
    const channel = supabase
      .channel(`post-${postId}-stats`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`
        },
        (payload) => {
          if (payload.new.views !== undefined) {
            setViews(payload.new.views)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [postId])

  if (showDetailed) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/50">
        <span>{views.toLocaleString()} views</span>
        <span>{likeCount.toLocaleString()} likes</span>
        <span>{commentCount.toLocaleString()} comments</span>
      </div>
    )
  }

  // Compact view for cards
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/45">
      <span>{views > 999 ? `${(views / 1000).toFixed(1)}k` : views} views</span>
      <span>{likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount} likes</span>
      <span>
        {commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount} comments
      </span>
    </div>
  )
}


