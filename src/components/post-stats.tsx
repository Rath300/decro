/**
 * Post Statistics Component
 * Comments only — views and likes are hidden from the UI.
 * Uses feed-provided counts; avoids per-card RPC N+1.
 */

'use client'

interface PostStatsProps {
  postId: string
  initialViews?: number
  initialLikes?: number
  initialComments?: number
  showDetailed?: boolean
}

export function PostStats({
  initialComments = 0,
  showDetailed = false,
}: PostStatsProps) {
  const commentCount = initialComments

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
