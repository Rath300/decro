'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePosts } from '@/context/post-context'
import { useAuth } from '@/context/auth-context'
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments'
import { PostStats } from '@/components/post-stats'
import supabase from '@/lib/supabase-client'

interface DetailModalProps {
  refetchPosts?: (sortBy?: 'created_at' | 'likes' | 'comments') => Promise<void>
}

export default function DetailModal({ refetchPosts: customRefetchPosts }: DetailModalProps) {
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
  
  // Use custom refetch function if provided, otherwise use context one
  const effectiveRefetchPosts = customRefetchPosts || refetchPosts
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])

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
  }, [isAuthenticated, commentText, handleComment, selectedCard, user?.id, user?.name, user?.email])

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false)
  }, [setShowDetailModal])

  if (!showDetailModal || !selectedCard) return null

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
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto" onClick={handleCloseModal}>
      <div className="max-w-4xl mx-auto p-6 bg-white" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={handleCloseModal}
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Back
            </button>
        </div>

          {/* Post Header - Reddit Style */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h1 className="text-2xl font-['Space_Mono'] font-bold text-black mb-4">
              {selectedCard.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <button
                onClick={() => handlePortfolioClick(selectedCard.creator)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                Posted by {selectedCard.creator}
              </button>
              <span>•</span>
              <span>{getTimeAgo(selectedCard.date)}</span>
              <span>•</span>
              <span>{selectedCard.views} views</span>
              {selectedCard.subgroupName && selectedCard.subgroupSlug && (
                <>
                  <span>•</span>
                  <span className="text-blue-600">
                    in <Link href={`/subgroup/${selectedCard.subgroupSlug}`} className="hover:underline">{selectedCard.subgroupName}</Link>
                  </span>
                </>
              )}
          </div>

            {/* Media Display */}
            {selectedCard.imageUrl || (['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl) ? (
              <div className="mb-4">
                {['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl ? (
                  <video src={selectedCard.videoUrl} controls className="w-full max-h-96 rounded-lg" />
                ) : (
                  <img src={selectedCard.imageUrl} alt={selectedCard.title} className="w-full max-h-96 object-contain rounded-lg bg-gray-100" />
                )}
              </div>
            ) : null}

              {selectedCard.description && (
              <div className="prose max-w-none mb-4">
                <p className="text-gray-800 whitespace-pre-wrap font-['Space_Mono']">
                  {selectedCard.description}
                </p>
                </div>
              )}

              {/* Actions */}
            <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
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
              <PostStats postId={selectedCard.id} initialViews={selectedCard.views} showDetailed />
              <OwnerDeleteButton postId={selectedCard.id} onDeleted={() => setShowDetailModal(false)} refetchPosts={effectiveRefetchPosts} />
            </div>
                </div>
              </div>

        {/* Comments Section */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-['Space_Mono'] font-bold text-black mb-4">
            Comments
          </h2>

          {/* Comment Input */}
          {isAuthenticated ? (
            <div className="mb-6">
              <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none text-black bg-white"
                rows={3}
                  />
              <div className="flex justify-end mt-2">
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!commentText.trim()}
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                  Comment
                  </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg text-center text-gray-500">
              Please sign in to comment
          </div>
          )}

          {/* Comments List */}
          <CommentsList postId={selectedCard.id} refreshSignal={commentsRefreshSignal} optimisticComments={optimisticComments} />
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
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  useEffect(() => { if (postId) refetch() }, [refreshSignal])
  useEffect(() => {
    const server = comments || []
    const optimistic = optimisticComments || []
    
    // Filter out problematic comments (anonymous, null usernames, old dates)
    const filterValidComments = (commentsList: RealtimeComment[]) => {
      return commentsList.filter(comment => {
        // Skip if no username or anonymous-like usernames
        if (!comment.username || 
            comment.username === 'anonymous' || 
            comment.username === 'Anonymous' ||
            comment.username.trim() === '' ||
            comment.created_at < '2020-01-01') {
          return false;
        }
        return true;
      });
    };
    
    const validServerComments = filterValidComments(server);
    const validOptimisticComments = filterValidComments(optimistic);
    
    if (validOptimisticComments.length === 0) { 
      setMerged(validServerComments); 
      return 
    }
    const filteredOptimistic = validOptimisticComments.filter(o => !validServerComments.some(s => s.content === o.content && Math.abs(new Date(s.created_at).getTime() - new Date(o.created_at).getTime()) < 60000))
    setMerged([...filteredOptimistic, ...validServerComments])
  }, [comments, optimisticComments])

  // Initialize liked comments state when comments change and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !merged.length) return;

    const initializeLikedComments = async () => {
      try {
        // Check which comments the user has liked
        const commentIds = merged.map(c => c.id);
        if (commentIds.length === 0) return;

        const { data: likedCommentData, error: likedError } = await supabase
          .rpc('get_user_liked_comment_ids', {
            external_id_param: user.id,
            comment_ids_param: commentIds
          });

        if (!likedError && likedCommentData) {
          const likedIds = likedCommentData.map((item: any) => item.comment_id as string);
          setLikedComments(prev => {
            // Merge with existing liked comments to avoid overwriting optimistic updates
            const newSet = new Set(prev);
            likedIds.forEach(id => newSet.add(id));
            return newSet;
          });
        }
      } catch (error) {
        console.error('Error initializing liked comments:', error);
      }
    };

    initializeLikedComments();
  }, [merged, isAuthenticated, user?.id]);

  const loadReplies = async (commentId: string) => {
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }))
    try {
      const { data, error } = await supabase.rpc('get_comment_replies_with_nesting', { 
        comment_id_param: commentId, 
        page_size: 20, 
        page_offset: 0 
      })
      if (error) {
        console.error('Error loading replies:', error)
      } else {
        setReplies(prev => ({ ...prev, [commentId]: (data || []) as any }))
      }
    } catch (error) {
      console.error('Error loading replies:', error)
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }))
    }
  }


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
    <div className="space-y-4">
      {merged.map((comment: RealtimeComment) => {
        const commentId = comment.id;
        return (
        <RedditComment
          key={commentId}
          comment={comment}
          depth={0}
          onReply={(content: string) => {
            if (!isAuthenticated || !user?.id) return
            // Implementation will be handled by reply input
          }}
          replies={replies}
          loadingReplies={loadingReplies}
          loadReplies={() => {
            if (!(commentId in replies)) {
              loadReplies(commentId)
            }
          }}
          openReplyFor={openReplyFor}
          setOpenReplyFor={setOpenReplyFor}
          replyText={replyText}
          setReplyText={setReplyText}
          refetch={refetch}
          updateVoteScore={(commentId, score) => {
            setMerged(prev => prev.map(c => 
              c.id === commentId ? { ...c, vote_score: score } : c
            ))
          }}
          visibleReplies={visibleReplies}
          setVisibleReplies={setVisibleReplies}
          likedComments={likedComments}
          setLikedComments={setLikedComments}
          setReplies={setReplies}
          setLoadingReplies={setLoadingReplies}
          commentId={commentId}
        />
        );
      })}
    </div>
  )
}

function RedditComment({ 
  comment, 
  depth, 
  onReply,
  replies,
  loadingReplies,
  loadReplies,
  openReplyFor,
  setOpenReplyFor,
  replyText,
  setReplyText,
  refetch,
  updateVoteScore,
  visibleReplies,
  setVisibleReplies,
  likedComments,
  setLikedComments,
  setReplies,
  setLoadingReplies,
  commentId
}: { 
  comment: RealtimeComment
  depth: number
  onReply: (content: string) => void
  replies: Record<string, RealtimeComment[]>
  loadingReplies: Record<string, boolean>
  loadReplies: () => void
  openReplyFor: string | null
  setOpenReplyFor: (id: string | null) => void
  replyText: Record<string, string>
  setReplyText: (setter: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) => void
  refetch?: () => void
  updateVoteScore?: (commentId: string, newVoteScore: number) => void
  visibleReplies: Set<string>
  setVisibleReplies: (setter: (prev: Set<string>) => Set<string>) => void
  likedComments: Set<string>
  setLikedComments: (setter: (prev: Set<string>) => Set<string>) => void
  setReplies: (setter: (prev: Record<string, RealtimeComment[]>) => Record<string, RealtimeComment[]>) => void
  setLoadingReplies: (setter: (prev: Record<string, boolean>) => Record<string, boolean>) => void
  commentId: string
}) {
  const { isAuthenticated, user } = useAuth()
  const maxDepth = 2

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
            {comment.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-['Space_Mono'] font-bold text-sm text-black">
              {comment.username || 'anonymous'}
            </span>
            {(comment as any).replying_to_username && (
              <span className="font-['Space_Mono'] text-xs text-gray-400">
                replying to {(comment as any).replying_to_username}
              </span>
            )}
            <span className="font-['Space_Mono'] text-xs text-gray-500">
              {getTimeAgo(comment.created_at)}
            </span>
          </div>
          <p className="font-['Space_Mono'] text-sm text-gray-800 mb-2 break-words">
            {comment.content}
          </p>
            
            {/* Reply and voting controls */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              {/* Show/Hide replies button */}
              {comment.reply_count && comment.reply_count > 0 && (
                <button
                  className="hover:text-black"
                  onClick={async () => {
                    const shouldShow = !visibleReplies.has(commentId);
                    
                    // Toggle replies visibility
                    setVisibleReplies(prev => {
                      const newVisibleReplies = new Set(prev);
                      if (newVisibleReplies.has(commentId)) {
                        newVisibleReplies.delete(commentId);
                      } else {
                        newVisibleReplies.add(commentId);
                      }
                      return newVisibleReplies;
                    });
                    
                    if (shouldShow && !replies[commentId as string]) {
                      // lazy load replies on open
                      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
                      const { data, error } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: commentId, page_size: 20, page_offset: 0 });
                      if (error) {
                        console.error('Error loading replies:', error);
                      } else {
                        setReplies(prev => ({ ...prev, [commentId]: (data || []) as any }));
                      }
                      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
                    }
                  }}
                >
                  {visibleReplies.has(commentId) ? 'Hide replies' : 'Show replies'}{typeof comment.reply_count === 'number' ? ` (${comment.reply_count})` : ''}
                </button>
              )}
              <button
                className="hover:text-black"
                onClick={() => {
                  setOpenReplyFor(openReplyFor === commentId ? null : commentId);
                }}
              >
                Reply
              </button>
              <button
                className={`flex items-center gap-1 transition-all duration-200 ${
                  likedComments.has(commentId)
                    ? 'text-red-500'
                    : 'hover:text-red-500'
                }`}
                onClick={async () => {
                  if (!isAuthenticated || !user?.id) return;
                  try {
                    const { data, error: rpcError } = await supabase.rpc('toggle_comment_vote_ext', { 
                      comment_id_param: commentId, 
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
                        refetch?.();
                        return;
                      }
                    }
                    
                    // Update both the vote score and liked status from the response
                    if (responseData && typeof responseData.vote_score === 'number' && typeof responseData.liked === 'boolean') {
                      updateVoteScore?.(commentId, responseData.vote_score);
                      
                      // Update liked comments state
                      setLikedComments(prev => {
                        const next = new Set(prev);
                        if (responseData.liked) {
                          next.add(commentId);
                        } else {
                          next.delete(commentId);
                        }
                        return next;
                      });
                    } else {
                      console.log('No vote_score or liked in response, refetching...');
                      // Fallback: refetch if response doesn't have expected fields
                      refetch?.();
                    }
                  } catch (error) {
                    console.error('Error toggling comment vote:', error);
                  }
                }}
              >
                <svg 
                  className={`w-4 h-4 ${likedComments.has(commentId) ? 'text-red-500' : 'text-gray-600'}`} 
                  fill={likedComments.has(commentId) ? 'currentColor' : 'none'} 
                  stroke={likedComments.has(commentId) ? 'currentColor' : 'currentColor'} 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{comment.vote_score || 0}</span>
              </button>
            </div>

            {/* Reply input */}
            {openReplyFor === commentId && (
              <div className="mt-3 pl-2 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <textarea
                    value={replyText[commentId] || ''}
                    onChange={(e) => setReplyText((prev: Record<string, string>) => ({ ...prev, [commentId]: e.target.value }))}
                    placeholder="Write a reply..."
                    className="w-full p-2 text-sm border border-gray-300 rounded resize-none text-black bg-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const content = replyText[commentId]?.trim();
                        if (!content || !isAuthenticated || !user?.id) return;
                        
                        setReplyText((prev: Record<string, string>) => ({ ...prev, [commentId]: '' }));
                        setReplies(prev => ({
                          ...prev,
                          [commentId]: [
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
                            ...(prev[commentId] || [])
                          ]
                        }));
                        
                        try {
                          await supabase.rpc('add_reply_ext', { comment_id_param: commentId, external_id_param: user.id, content_param: content });
                          // Refresh replies
                          const { data } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: commentId, page_size: 20, page_offset: 0 });
                          setReplies(prev => ({ ...prev, [commentId]: (data || []) as any }));
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
                        // Clear the reply text first, then close the input
                        setReplyText((prev: Record<string, string>) => ({ ...prev, [commentId]: '' }));
                        // Use setTimeout to ensure state update happens before closing
                        setTimeout(() => {
                          setOpenReplyFor(null);
                        }, 0);
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
            {visibleReplies.has(commentId) && (
              <div className="mt-4 space-y-3">
                {loadingReplies[commentId] ? (
                  <div className="text-sm text-gray-500">Loading replies...</div>
                ) : (
                  <div className="space-y-3">
                    {(replies[commentId] || []).map(r => (
                      <div key={r.id} className="ml-6 border-l-2 border-gray-100 pl-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {r.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-['Space_Mono'] font-bold text-sm text-black">
                                {r.username || 'anonymous'}
                              </span>
                              {(r as any).replying_to_username && (
                                <span className="font-['Space_Mono'] text-xs text-gray-400">
                                  replying to {(r as any).replying_to_username}
                                </span>
                              )}
                              <span className="font-['Space_Mono'] text-xs text-gray-500">
                                {getTimeAgo(r.created_at)}
                              </span>
                            </div>
                            <p className="font-['Space_Mono'] text-sm text-gray-800 mb-2 break-words">
                              {r.content}
                            </p>
                            
                            {/* Reply like button */}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <button
                                className={`flex items-center gap-1 transition-all duration-200 ${
                                  likedComments.has(r.id)
                                    ? 'text-red-500'
                                    : 'hover:text-red-500'
                                }`}
                                onClick={async () => {
                                  if (!isAuthenticated || !user?.id) return
                                  try {
                                    const { data, error: rpcError } = await supabase.rpc('toggle_comment_vote_ext', { 
                                      comment_id_param: r.id, 
                                      external_id_param: user.id, 
                                      direction: 1 
                                    })
                                    
                                    if (rpcError) {
                                      console.error('RPC error:', rpcError)
                                      return
                                    }
                                    
                                    let responseData = data
                                    if (typeof data === 'string') {
                                      try {
                                        responseData = JSON.parse(data)
                                      } catch (e) {
                                        console.error('Failed to parse response:', e)
                                        return
                                      }
                                    }
                                    
                                    if (responseData && typeof responseData.vote_score === 'number' && typeof responseData.liked === 'boolean') {
                                      // Update replies state
                                      setReplies(prev => ({
                                        ...prev,
                                        [commentId]: prev[commentId]?.map(reply => 
                                          reply.id === r.id ? { ...reply, vote_score: responseData.vote_score } : reply
                                        ) || []
                                      }))
                                      
                                      // Update liked comments state
                                      setLikedComments(prev => {
                                        const next = new Set(prev)
                                        if (responseData.liked) {
                                          next.add(r.id)
                                        } else {
                                          next.delete(r.id)
                                        }
                                        return next
                                      })
                                    }
                                  } catch (error) {
                                    console.error('Error toggling reply vote:', error)
                                  }
                                }}
                              >
                                <svg 
                                  className={`w-4 h-4 ${likedComments.has(r.id) ? 'text-red-500' : 'text-gray-600'}`} 
                                  fill={likedComments.has(r.id) ? 'currentColor' : 'none'} 
                                  stroke={likedComments.has(r.id) ? 'currentColor' : 'currentColor'} 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                                <span>{r.vote_score || 0}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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


