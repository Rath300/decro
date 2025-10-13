'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import { useAuth } from '@/context/auth-context'
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments'
import { PostStats } from '@/components/post-stats'
import supabase from '@/lib/supabase-client'

export default function DetailModal() {
  const {
    showDetailModal,
    setShowDetailModal,
    selectedCard,
    commentText,
    setCommentText,
    handleComment,
    likedCards,
    toggleLike,
  } = usePosts()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])

  if (!showDetailModal || !selectedCard) return null

  const handlePortfolioClick = async (creatorId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', creatorId)
        .single()
      if (data?.username) router.push(`/profile/${data.username}`)
    } catch {}
  }

  const handleCommentSubmit = () => {
    if (!isAuthenticated) return
    const content = commentText.trim()
    handleComment()
    if (selectedCard && content) {
      const optimistic: RealtimeComment = {
        id: `local-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || 'anon',
        username: user?.name || user?.email || 'You',
        full_name: user?.name || null,
        avatar_url: null,
      }
      setOptimisticComments((prev) => [optimistic, ...prev])
      setCommentsRefreshSignal((n) => n + 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-['Space_Mono'] font-bold text-black">{selectedCard.title}</h2>
          <button onClick={() => setShowDetailModal(false)} aria-label="Close" className="text-gray-500 hover:text-black">✕</button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Media or Forum-style body */}
          <div className="lg:w-2/3 p-6">
            <div className="relative">
              {selectedCard.imageUrl || (['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl) ? (
                <> 
                  {['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl ? (
                    <video src={selectedCard.videoUrl} controls className="w-full h-auto rounded" />
                  ) : (
                    <img src={selectedCard.imageUrl} alt={selectedCard.title} className="w-full h-auto rounded" />
                  )}
                </>
              ) : (
                // Forum-style body for text-only posts
                <div className="border border-gray-200 rounded p-4">
                  <h3 className="text-lg font-['Space_Mono'] font-bold text-black mb-2">{selectedCard.title}</h3>
                  {selectedCard.description ? (
                    <p className="text-sm font-['Space_Mono'] text-gray-800 whitespace-pre-wrap">{selectedCard.description}</p>
                  ) : (
                    <p className="text-sm font-['Space_Mono'] text-gray-500">No body content provided.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="lg:w-1/3 p-6 border-l border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-['Space_Mono'] font-bold text-black">{selectedCard.title}</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePortfolioClick(selectedCard.creator)}
                  className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {selectedCard.creator}
                </button>
              </div>

              <div className="text-sm font-['Space_Mono'] text-gray-600 mb-2">
                {new Date(selectedCard.date).toLocaleDateString()} • {selectedCard.views} views
              </div>

              {selectedCard.description && (
                <p className="text-sm text-gray-700 font-['Space_Mono']">{selectedCard.description}</p>
              )}
              {selectedCard.tags && selectedCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCard.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-black text-white text-xs font-['Space_Mono']">#{tag}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-gray-200 pt-4 mb-4 flex items-center gap-3">
                <button
                  onClick={() => toggleLike(selectedCard.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    likedCards.has(selectedCard.id)
                      ? 'bg-red-50 text-red-500'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={likedCards.has(selectedCard.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="transition-all duration-200">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <span className="font-['Space_Mono'] text-sm">{likedCards.has(selectedCard.id) ? 'Liked' : 'Like'}</span>
                </button>
                <div>
                  <PostStats postId={selectedCard.id} initialViews={selectedCard.views} />
                </div>
                <OwnerDeleteButton postId={selectedCard.id} onDeleted={() => setShowDetailModal(false)} />
              </div>

              {/* Comments */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-['Space_Mono'] font-medium text-black mb-3">Comments</h3>
                <div className="flex space-x-2 mb-4">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-['Space_Mono'] text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                    onKeyPress={(e) => { if (e.key === 'Enter') handleCommentSubmit() }}
                  />
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!commentText.trim()}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      commentText.trim() ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    ➤
                  </button>
                </div>
                <CommentsList postId={selectedCard.id} refreshSignal={commentsRefreshSignal} optimisticComments={optimisticComments} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CommentsList({ postId, refreshSignal, optimisticComments }: { postId: string; refreshSignal: number; optimisticComments: RealtimeComment[] }) {
  const { comments, loading, refetch } = useRealtimeComments(postId)
  const [merged, setMerged] = useState<RealtimeComment[]>([])

  useEffect(() => { if (postId) refetch() }, [refreshSignal])
  useEffect(() => {
    const server = comments || []
    const optimistic = optimisticComments || []
    if (optimistic.length === 0) { setMerged(server); return }
    const filteredOptimistic = optimistic.filter(o => !server.some(s => s.content === o.content && Math.abs(new Date(s.created_at).getTime() - new Date(o.created_at).getTime()) < 60000))
    setMerged([...filteredOptimistic, ...server])
  }, [comments, optimisticComments])

  if (loading && merged.length === 0) {
    return <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">Loading comments...</div>
  }
  if (merged.length === 0) {
    return <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">No comments yet. Be the first to comment!</div>
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {merged.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
            {comment.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-['Space_Mono'] font-bold text-sm text-black">{comment.username || 'Anonymous'}</span>
              <span className="font-['Space_Mono'] text-xs text-gray-500">{getTimeAgo(comment.created_at)}</span>
            </div>
            <p className="font-['Space_Mono'] text-sm text-gray-800 mt-1 break-words">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function OwnerDeleteButton({ postId, onDeleted }: { postId: string; onDeleted: () => void }) {
  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!user?.id || !postId) return
    supabase
      .from('posts')
      .select('creator_id')
      .eq('id', postId)
      .single()
      .then(({ data }) => {
        if (data && data.creator_id === user.id) setIsOwner(true)
      })
  }, [user?.id, postId])

  if (!isOwner) return null

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw error
      onDeleted()
      window.location.reload()
    } catch (e) {
      console.error('Failed to delete post:', e)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button onClick={handleDelete} disabled={isDeleting} className="px-3 py-2 text-sm border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50">
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}


