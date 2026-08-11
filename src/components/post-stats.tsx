/**
 * Post Statistics Component
 * Shows views, likes, and comments — with a working like toggle.
 */

'use client'

import { useRealtimeLikes } from '@/hooks/use-realtime-likes'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'

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
  showDetailed = false,
}: PostStatsProps) {
  const likeCount = useRealtimeLikes(postId, initialLikes)
  const [views, setViews] = useState(initialViews)
  const [commentCount, setCommentCount] = useState(initialComments)
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [localLikes, setLocalLikes] = useState<number | null>(null)

  useEffect(() => {
    if (!postId) return

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('views')
          .eq('id', postId)
          .maybeSingle()

        if (!error && data) {
          setViews(data.views || 0)
        } else {
          setViews(initialViews)
        }

        const { data: commentsData, error: commentsError } = await supabase.rpc(
          'get_comment_count',
          { post_id_param: postId }
        )

        if (!commentsError && commentsData !== null && commentsData !== undefined) {
          setCommentCount(commentsData)
        } else {
          setCommentCount(initialComments)
        }
      } catch {
        setViews(initialViews)
        setCommentCount(initialComments)
      }
    }

    fetchStats()

    const channel = supabase
      .channel(`post-${postId}-stats`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`,
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
  }, [postId, initialViews, initialComments])

  const displayedLikes = localLikes ?? likeCount

  const toggleLike = async () => {
    if (liking || !postId) return
    setLiking(true)
    const next = !liked
    const prevCount = displayedLikes
    setLiked(next)
    setLocalLikes(Math.max(0, prevCount + (next ? 1 : -1)))
    try {
      const { error } = await callRpc('toggle_like_ext', {
        post_id_param: postId,
      })
      if (error) throw new Error(error.message)
    } catch {
      setLiked(!next)
      setLocalLikes(prevCount)
    } finally {
      setLiking(false)
    }
  }

  if (showDetailed) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/50">
        <span>{views.toLocaleString()} views</span>
        <button
          type="button"
          onClick={toggleLike}
          disabled={liking}
          className={`uppercase tracking-wide ${
            liked
              ? 'text-black underline underline-offset-2'
              : 'hover:text-black'
          } disabled:opacity-40`}
        >
          {displayedLikes.toLocaleString()} {liked ? 'liked' : 'likes'}
        </button>
        <span>
          {commentCount.toLocaleString()}{' '}
          {commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/45">
      <span>{views > 999 ? `${(views / 1000).toFixed(1)}k` : views} views</span>
      <span>
        {displayedLikes > 999
          ? `${(displayedLikes / 1000).toFixed(1)}k`
          : displayedLikes}{' '}
        likes
      </span>
      <span>
        {commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount}{' '}
        comments
      </span>
    </div>
  )
}
