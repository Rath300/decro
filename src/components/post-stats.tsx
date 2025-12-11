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
      <div className="flex items-center gap-6 text-sm font-['Space_Mono'] text-gray-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>{views.toLocaleString()} views</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span>{likeCount.toLocaleString()} likes</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{commentCount.toLocaleString()} comments</span>
        </div>
      </div>
    )
  }

  // Compact view for cards
  return (
    <div className="flex items-center gap-3 text-xs font-['Space_Mono'] text-gray-500">
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        {views > 999 ? `${(views / 1000).toFixed(1)}k` : views}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount}
      </span>
    </div>
  )
}


