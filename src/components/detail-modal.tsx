'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
    refetchPosts,
  } = usePosts()
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])

  if (!showDetailModal || !selectedCard) return null

  const handlePortfolioClick = useCallback(async (creatorId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', creatorId)
        .single()
      if (data?.username) router.push(`/profile/${data.username}`)
    } catch {}
  }, [router])

  const handleCommentSubmit = useCallback(() => {
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
  }, [isAuthenticated, commentText, handleComment, selectedCard, user?.id, user?.name, user?.email, setOptimisticComments, setCommentsRefreshSignal])

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false)
  }, [setShowDetailModal])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-['Space_Mono'] font-bold text-black">{selectedCard.title}</h2>
          <button onClick={handleCloseModal} aria-label="Close" className="text-gray-500 hover:text-black">✕</button>
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
                <OwnerDeleteButton postId={selectedCard.id} onDeleted={() => setShowDetailModal(false)} refetchPosts={refetchPosts} />
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
  const { isAuthenticated, user } = useAuth()
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replies, setReplies] = useState<Record<string, RealtimeComment[]>>({})
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set())

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
            
            {/* Reply and voting controls */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <button
                className="hover:text-black"
                onClick={async () => {
                  // Toggle replies visibility
                  const newVisibleReplies = new Set(visibleReplies);
                  if (newVisibleReplies.has(comment.id)) {
                    newVisibleReplies.delete(comment.id);
                    setVisibleReplies(newVisibleReplies);
                  } else {
                    newVisibleReplies.add(comment.id);
                    setVisibleReplies(newVisibleReplies);
                    // lazy load replies on open
                    if (!replies[comment.id]) {
                      setLoadingReplies(prev => ({ ...prev, [comment.id]: true }));
                      const { data, error } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: comment.id, page_size: 20, page_offset: 0 });
                      if (error) {
                        console.error('Error loading replies:', error);
                      } else {
                        setReplies(prev => ({ ...prev, [comment.id]: (data || []) as any }));
                      }
                      setLoadingReplies(prev => ({ ...prev, [comment.id]: false }));
                    }
                  }
                }}
              >
                {visibleReplies.has(comment.id) ? 'Hide replies' : 'Show replies'}{typeof comment.reply_count === 'number' ? ` (${comment.reply_count})` : ''}
              </button>
              <button
                className="hover:text-black"
                onClick={() => {
                  setOpenReplyFor(openReplyFor === comment.id ? null : comment.id);
                }}
              >
                Reply
              </button>
              <button
                className="hover:text-red-500 flex items-center gap-1"
                onClick={async () => {
                  if (!isAuthenticated || !user?.id) return;
                  try {
                    const { data, error: rpcError } = await supabase.rpc('toggle_comment_vote_ext', { 
                      comment_id_param: comment.id, 
                      external_id_param: user.id, 
                      direction: 1 
                    });
                    
                    if (rpcError) {
                      console.error('RPC error:', rpcError);
                      return;
                    }
                    
                    console.log('Comment vote response:', data);
                    
                    // Parse the JSON response if it's a string
                    let responseData = data;
                    if (typeof data === 'string') {
                      try {
                        responseData = JSON.parse(data);
                      } catch (e) {
                        console.error('Failed to parse response:', e);
                        refetch();
                        return;
                      }
                    }
                    
                    // Update the comment vote score immediately from the response
                    if (responseData && typeof responseData.vote_score === 'number') {
                      setMerged(prev => prev.map(c => 
                        c.id === comment.id ? { ...c, vote_score: responseData.vote_score } : c
                      ));
                    } else {
                      console.log('No vote_score in response, refetching...');
                      // Fallback: refetch if response doesn't have vote_score
                      refetch();
                    }
                  } catch (error) {
                    console.error('Error toggling comment vote:', error);
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{comment.vote_score || 0}</span>
              </button>
            </div>

            {/* Reply input */}
            {openReplyFor === comment.id && (
              <div className="mt-3 pl-2 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <textarea
                    value={replyText[comment.id] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                    placeholder="Write a reply..."
                    className="w-full p-2 text-sm border border-gray-300 rounded resize-none text-black bg-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const content = replyText[comment.id]?.trim();
                        if (!content || !isAuthenticated || !user?.id) return;
                        
                        setReplyText(prev => ({ ...prev, [comment.id]: '' }));
                        setReplies(prev => ({
                          ...prev,
                          [comment.id]: [
                            {
                              id: `temp-${Date.now()}`,
                              content,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString(),
                              user_id: user.id,
                              username: user.name || user.email?.split('@')[0] || 'You',
                              full_name: user.name || null,
                              avatar_url: null,
                              vote_score: 0,
                              reply_count: 0
                            } as RealtimeComment,
                            ...(prev[comment.id] || [])
                          ]
                        }));
                        
                        try {
                          await supabase.rpc('add_reply_ext', { comment_id_param: comment.id, external_id_param: user.id, content_param: content });
                          // Refresh replies
                          const { data } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: comment.id, page_size: 20, page_offset: 0 });
                          setReplies(prev => ({ ...prev, [comment.id]: (data || []) as any }));
                        } catch (error) {
                          console.error('Error adding reply:', error);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-800"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => {
                        setOpenReplyFor(null);
                        setReplyText(prev => ({ ...prev, [comment.id]: '' }));
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show replies */}
            {visibleReplies.has(comment.id) && (
              <div className="mt-3 pl-2 border-l border-gray-200">
                {loadingReplies[comment.id] ? (
                  <div className="text-xs text-gray-500">Loading replies...</div>
                ) : (
                  <div className="space-y-2">
                    {(replies[comment.id] || []).map(r => (
                      <div key={r.id} className="flex gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                          {r.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-['Space_Mono'] font-bold text-xs text-black">{r.username || 'Anonymous'}</span>
                            {(r as any).replying_to_username && (
                              <span className="font-['Space_Mono'] text-[10px] text-gray-400">
                                replying to {(r as any).replying_to_username}
                              </span>
                            )}
                            <span className="font-['Space_Mono'] text-[10px] text-gray-500">{getTimeAgo(r.created_at)}</span>
                          </div>
                          <p className="font-['Space_Mono'] text-xs text-gray-800 mt-1 break-words">{r.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function OwnerDeleteButton({ postId, onDeleted, refetchPosts }: { postId: string; onDeleted: () => void; refetchPosts?: (sortBy?: 'created_at' | 'likes' | 'comments') => Promise<void> }) {
  const { user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!user?.id || !postId) return
    
    const checkOwnership = async () => {
      try {
        // Get the profile ID from external ID first
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single()

        if (profileError || !profileData) return

        // Check if the post creator matches the profile ID
        const { data, error } = await supabase
          .from('posts')
          .select('creator_id')
          .eq('id', postId)
          .single()

        if (!error && data && data.creator_id === profileData.id) {
          setIsOwner(true)
        }
      } catch (error) {
        console.error('Failed to check post ownership:', error)
      }
    }

    checkOwnership()
  }, [user?.id, postId])

  if (!isOwner) return null

  const handleDelete = async () => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      console.log('Attempting to delete post:', postId, 'user:', user?.id)
      
      const { data, error } = await supabase.rpc('delete_post_ext', {
        post_id_param: postId,
        external_id_param: user?.id
      })

      console.log('Delete result:', { data, error })
      
      if (error) {
        console.error('Delete error details:', error)
        throw error
      }

      if (data && data.error) {
        throw new Error(data.error)
      }

      if (data && data.success) {
        console.log('Post deleted successfully:', data.deleted_post)
        onDeleted()
        // Refresh the posts data instead of reloading the page
        if (refetchPosts) {
          await refetchPosts('created_at')
        }
      } else {
        throw new Error('Unknown error occurred')
      }
    } catch (e: any) {
      console.error('Failed to delete post:', e)
      alert('Failed to delete post: ' + (e.message || 'Please try again.'))
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


