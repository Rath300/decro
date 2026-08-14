/**
 * Post Statistics Component
 * Comments only — views and likes are hidden from the UI.
 */

'use client'

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
  initialComments = 0,
  showDetailed = false,
}: PostStatsProps) {
  const [commentCount, setCommentCount] = useState(initialComments)

  useEffect(() => {
    if (!postId) return

    const fetchStats = async () => {
      try {
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
        setCommentCount(initialComments)
      }
    }

    fetchStats()
  }, [postId, initialComments])

  const label =
    commentCount === 1
      ? '1 comment'
      : `${commentCount > 999 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount} comments`

  return (
    <div
      className={
        showDetailed
          ? "flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/50"
          : "flex items-center gap-3 text-[10px] uppercase tracking-wide font-['Space_Mono'] text-black/45"
      }
    >
      <span>{label}</span>
    </div>
  )
}
