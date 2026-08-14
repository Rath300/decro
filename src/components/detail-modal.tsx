'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import { useAuth } from '@/context/auth-context'
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments'
import { PostStats } from '@/components/post-stats'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'
import { isPitchMode } from '@/lib/pitch-mode'

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
  const pitchMode = isPitchMode()
  const canComment = isAuthenticated || pitchMode

  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])
  const [guestUsername, setGuestUsername] = useState('')

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

  const handleCommentSubmit = useCallback(async () => {
    if (!canComment) return
    const content = commentText.trim()
    if (!selectedCard || !content) return

    const displayName =
      isAuthenticated
        ? user?.name || user?.email || 'You'
        : guestUsername.trim() || 'anonymous'

    const optimistic: RealtimeComment = {
      id: `local-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user?.id || 'guest',
      username: displayName,
      full_name: user?.name || null,
      avatar_url: null,
    }
    setOptimisticComments((prev) => [optimistic, ...prev])
    setCommentsRefreshSignal((n) => n + 1)

    if (isAuthenticated) {
      // Context handler clears commentText and posts via /api/rpc.
      handleComment()
      return
    }

    setCommentText('')
    // Pitch guest path — cookie resolved server-side in /api/rpc.
    const args: Record<string, unknown> = {
      post_id_param: selectedCard.id,
      content_param: content,
    }
    if (guestUsername.trim()) args.pitch_username = guestUsername.trim()
    const { error } = await callRpc('add_comment_ext', args)
    if (error) {
      setOptimisticComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      alert('Failed to add comment: ' + (error.message || 'Please try again'))
      setCommentText(content)
    }
  }, [
    canComment,
    isAuthenticated,
    commentText,
    handleComment,
    selectedCard,
    user?.id,
    user?.name,
    user?.email,
    guestUsername,
    setCommentText,
  ])

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
    <div
      className={`fixed inset-x-0 bottom-0 bg-white overflow-y-auto ${
        pitchMode ? 'top-14 z-[55]' : 'inset-0 z-50 top-0'
      }`}
      onClick={handleCloseModal}
    >
      <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-white" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={handleCloseModal}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back
          </button>
        </div>

        {/* Desktop: Side-by-side layout | Mobile: Stacked */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT: Media and Info */}
          <div className="lg:w-2/3 space-y-6">
            {/* Post Header */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h1 className="text-2xl font-['Space_Mono'] font-normal text-black mb-4">
                {selectedCard.title}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <button
                  onClick={() => handlePortfolioClick(selectedCard.creator)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Posted by {selectedCard.creator}
                </button>
                {selectedCard.subgroupName && selectedCard.subgroupSlug && (
                  <>
                    <span>•</span>
                    <button
                      type="button"
                      className="text-black underline underline-offset-2 hover:no-underline"
                      onClick={() => {
                        handleCloseModal()
                        router.push(`/subgroup/${selectedCard.subgroupSlug}`)
                      }}
                    >
                      in {selectedCard.subgroupName}
                    </button>
                  </>
                )}
              </div>

              {/* Media Display - MUCH LARGER on desktop */}
              {selectedCard.imageUrl || (['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl) ? (
                <div className="mb-4">
                  {['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl ? (
                    <video src={selectedCard.videoUrl} controls className="w-full max-h-[500px] sm:max-h-[700px] lg:max-h-[900px] rounded-lg" />
                  ) : (
                    <img src={selectedCard.imageUrl} alt={selectedCard.title} className="w-full max-h-[500px] sm:max-h-[700px] lg:max-h-[900px] object-contain rounded-lg bg-gray-100" />
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

              {/* Actions - Bottom Left on Desktop */}
              <div className="flex items-center gap-4 border-t border-gray-200 pt-4">
                <PostStats postId={selectedCard.id} initialViews={selectedCard.views} showDetailed />
                <OwnerDeleteButton postId={selectedCard.id} onDeleted={() => setShowDetailModal(false)} refetchPosts={effectiveRefetchPosts} />
              </div>
            </div>
          </div>

          {/* RIGHT: Comments Only */}
          <div className="lg:w-1/3">
            <div className="border border-gray-200 rounded-lg p-6 lg:sticky lg:top-6">
          <h2 className="text-lg font-['Space_Mono'] font-normal text-black mb-4">
            Comments
          </h2>

          {/* Comment Input */}
          {canComment ? (
            <div className="mb-6">
              {pitchMode && !isAuthenticated && (
                <input
                  type="text"
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  placeholder="username (optional)"
                  className="w-full mb-2 p-3 border border-gray-300 rounded-lg text-black bg-white font-['Space_Mono'] text-sm"
                  maxLength={24}
                />
              )}
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
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null)

  const sanitizeCommentList = useCallback((commentsList: RealtimeComment[]): RealtimeComment[] => {
    return commentsList.map((comment) => {
      const usernameCandidate = comment.username?.trim()
      const fallbackUsername =
        (!usernameCandidate || usernameCandidate.toLowerCase() === 'anonymous')
          ? (comment.full_name?.trim() || (comment.user_id ? `user-${String(comment.user_id).slice(0, 8)}` : 'member'))
          : usernameCandidate

      const createdValid = comment.created_at && !Number.isNaN(Date.parse(comment.created_at))
      const updatedValid = comment.updated_at && !Number.isNaN(Date.parse(comment.updated_at))
      const normalizedCreated = createdValid
        ? comment.created_at
        : updatedValid
          ? (comment.updated_at as string)
          : new Date().toISOString()
      const normalizedUpdated = updatedValid ? comment.updated_at : normalizedCreated

      return {
        ...comment,
        username: fallbackUsername,
        created_at: normalizedCreated,
        updated_at: normalizedUpdated,
      }
    })
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCurrentProfileId(null)
      return
    }

    let cancelled = false

    const resolveProfileId = async () => {
      try {
        const { data, error } = await callRpc('ensure_profile', { external_id_param: user.id })
        if (!cancelled && !error && data) {
          setCurrentProfileId(data as string)
          return
        }
      } catch (ensureError) {
        console.warn('ensure_profile failed in CommentsList:', ensureError)
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .limit(1)
          .maybeSingle()

        if (!cancelled && !error && data?.id) {
          setCurrentProfileId(data.id)
        }
      } catch (fallbackError) {
        if (!cancelled) {
          console.warn('Failed to resolve current profile id:', fallbackError)
        }
      }
    }

    resolveProfileId()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  useEffect(() => { if (postId) refetch() }, [refreshSignal])
  useEffect(() => {
    const server = comments || []
    const optimistic = optimisticComments || []

    const sanitizeComments = (commentsList: RealtimeComment[]): RealtimeComment[] => {
      return commentsList.map((comment) => {
        const usernameCandidate = comment.username?.trim()
        const fallbackUsername =
          (!usernameCandidate || usernameCandidate.toLowerCase() === 'anonymous')
            ? (comment.full_name?.trim() || (comment.user_id ? `user-${String(comment.user_id).slice(0, 8)}` : 'member'))
            : usernameCandidate

        const createdValid = comment.created_at && !Number.isNaN(Date.parse(comment.created_at))
        const updatedValid = comment.updated_at && !Number.isNaN(Date.parse(comment.updated_at))
        const normalizedCreated = createdValid
          ? comment.created_at
          : updatedValid
            ? (comment.updated_at as string)
            : new Date().toISOString()
        const normalizedUpdated = updatedValid ? comment.updated_at : normalizedCreated

        return {
          ...comment,
          username: fallbackUsername,
          created_at: normalizedCreated,
          updated_at: normalizedUpdated,
        }
      })
    }

    const sanitizedServer = sanitizeCommentList(server)
    const sanitizedOptimistic = sanitizeCommentList(optimistic)

    if (sanitizedOptimistic.length === 0) {
      setMerged(sanitizedServer)
      return
    }

    const filteredOptimistic = sanitizedOptimistic.filter((optimisticComment) => {
      return !sanitizedServer.some((serverComment) => {
        const timestampsDiff = Math.abs(new Date(serverComment.created_at).getTime() - new Date(optimisticComment.created_at).getTime())
        return serverComment.content === optimisticComment.content && timestampsDiff < 60000
      })
    })

    setMerged([...filteredOptimistic, ...sanitizedServer])
  }, [comments, optimisticComments])

  // Initialize liked comments state when comments change and user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !merged.length) return;

    const initializeLikedComments = async () => {
      try {
        // Check which comments the user has liked
        const commentIds = merged.map(c => c.id);
        if (commentIds.length === 0) return;

        const { data: likedCommentData, error: likedError } = await callRpc<any[]>(
          'get_user_liked_comment_ids',
          { comment_ids_param: commentIds }
        );

        if (!likedError && likedCommentData) {
          const likedIds = likedCommentData.map((item: any) => item.comment_id as string);
          setLikedComments(prev => {
            // Merge with existing liked comments to avoid overwriting optimistic updates
            const newSet = new Set(prev);
            likedIds.forEach((id: string) => newSet.add(id));
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
        const sanitizedReplies = sanitizeCommentList((data as RealtimeComment[] | null) || [])
        setReplies(prev => ({ ...prev, [commentId]: sanitizedReplies }))
      }
    } catch (error) {
      console.error('Error loading replies:', error)
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }))
    }
  }

  const handleRemoveComment = useCallback((commentId: string, parentId?: string) => {
    if (parentId) {
      setReplies(prev => ({
        ...prev,
        [parentId]: (prev[parentId] || []).filter(reply => reply.id !== commentId)
      }))
      setMerged(prev => prev.map(comment => {
        if (comment.id === parentId) {
          const nextCount = Math.max(0, (comment.reply_count ?? 1) - 1)
          return { ...comment, reply_count: nextCount }
        }
        return comment
      }))
    } else {
      setMerged(prev => prev.filter(comment => comment.id !== commentId))
      setReplies(prev => {
        const next = { ...prev }
        delete next[commentId]
        return next
      })
    }

    setLikedComments(prev => {
      const next = new Set(prev)
      next.delete(commentId)
      return next
    })
  }, [])


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
          currentProfileId={currentProfileId}
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
          onDeleteComment={handleRemoveComment}
          sanitizeCommentList={sanitizeCommentList}
        />
        );
      })}
    </div>
  )
}

function RedditComment({ 
  comment, 
  depth, 
  currentProfileId,
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
  commentId,
  onDeleteComment,
  sanitizeCommentList
}: { 
  comment: RealtimeComment
  depth: number
  currentProfileId: string | null
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
  onDeleteComment: (commentId: string, parentId?: string) => void
  sanitizeCommentList: (comments: RealtimeComment[]) => RealtimeComment[]
}) {
  const { isAuthenticated, user } = useAuth()
  const toast = useToast()
  const maxDepth = 2

  const canDelete = useMemo(() => {
    if (!user?.id) return false
    if (currentProfileId && comment.user_id) {
      return comment.user_id === currentProfileId || comment.user_id === user.id
    }
    return comment.user_id === user.id
  }, [comment.user_id, currentProfileId, user?.id])

  const handleDeleteComment = async () => {
    if (!isAuthenticated || !user?.id || !canDelete) return
    const confirmed = window.confirm('Delete this comment?')
    if (!confirmed) return

    try {
      const { data, error } = await callRpc('delete_comment_ext', {
        comment_id_param: commentId,
      })

      if (error) throw error
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to delete comment')
      }

      onDeleteComment(commentId)
      toast.success('Comment deleted')
      refetch?.()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      toast.error('Failed to delete comment')
    }
  }

  const handleDeleteReply = async (replyId: string) => {
    if (!isAuthenticated || !user?.id) return
    const reply = replies[commentId]?.find(r => r.id === replyId)
    const canDeleteReply = reply && (reply.user_id === currentProfileId || reply?.user_id === user.id)
    if (!canDeleteReply) return

    const confirmed = window.confirm('Delete this reply?')
    if (!confirmed) return

    try {
      const { data, error } = await callRpc('delete_comment_ext', {
        comment_id_param: replyId,
      })

      if (error) throw error
      if (data && data.success === false) {
        throw new Error(data.error || 'Failed to delete reply')
      }

      onDeleteComment(replyId, commentId)
      toast.success('Reply deleted')
      refetch?.()
    } catch (error) {
      console.error('Failed to delete reply:', error)
      toast.error('Failed to delete reply')
    }
  }

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
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-normal text-gray-600 flex-shrink-0">
            {comment.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-['Space_Mono'] font-normal text-sm text-black">
              {comment.full_name?.trim() || comment.username || 'anonymous'}
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
              {/* Delete button (owner only) */}
              {user?.name === comment.username && (
                <button
                  className="text-red-500 hover:text-red-700 transition-colors"
                  onClick={async () => {
                    if (!confirm('Delete this comment?')) return;
                    try {
                      const { data, error } = await callRpc('delete_comment_ext', {
                        comment_id_param: commentId,
                      });
                      if (error) throw error;
                      if (data && data.success) {
                        refetch?.();
                      } else {
                        alert(data?.error || 'Failed to delete');
                      }
                    } catch (error) {
                      console.error('Delete failed:', error);
                      alert('Failed to delete comment');
                    }
                  }}
                >
                  Delete
                </button>
              )}
              
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
                        const sanitizedReplies = sanitizeCommentList((data as RealtimeComment[] | null) || [])
                        setReplies(prev => ({ ...prev, [commentId]: sanitizedReplies }));
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
              {canDelete && (
                <button
                  className="hover:text-red-500"
                  onClick={handleDeleteComment}
                >
                  Delete
                </button>
              )}
              <button
                className={`flex items-center gap-1 transition-all duration-200 ${
                  likedComments.has(commentId)
                    ? 'text-red-500'
                    : 'hover:text-red-500'
                }`}
                onClick={async () => {
                  if (!isAuthenticated || !user?.id) return;
                  try {
                    const { data, error: rpcError } = await callRpc('toggle_comment_vote_ext', { 
                      comment_id_param: commentId, 
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
            {openReplyFor === commentId && (isAuthenticated || isPitchMode()) && (
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
                        const content = replyText[commentId]?.trim()
                        if (!content) return
                        if (!isAuthenticated && !isPitchMode()) return

                        setReplyText((prev: Record<string, string>) => ({ ...prev, [commentId]: '' }))
                        setOpenReplyFor(null)

                        try {
                          const { error } = await callRpc('add_reply_ext', {
                            comment_id_param: commentId,
                            content_param: content,
                          })
                          if (error) throw error

                          const { data } = await supabase.rpc('get_comment_replies_with_nesting', {
                            comment_id_param: commentId,
                            page_size: 20,
                            page_offset: 0,
                          })
                          const sanitized = sanitizeCommentList((data as RealtimeComment[] | null) || [])
                          setReplies((prev) => ({ ...prev, [commentId]: sanitized }))

                          setVisibleReplies((prev) => {
                            const next = new Set(prev)
                            next.add(commentId)
                            return next
                          })
                        } catch (error: any) {
                          console.error('Error adding reply:', error)
                          alert('Failed to add reply: ' + (error?.message || 'Please try again.'))
                          setReplyText((prev: Record<string, string>) => ({
                            ...prev,
                            [commentId]: content,
                          }))
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
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-normal text-gray-600 flex-shrink-0">
                            {r.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-['Space_Mono'] font-normal text-sm text-black">
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
                                    const { data, error: rpcError } = await callRpc('toggle_comment_vote_ext', { 
                                      comment_id_param: r.id, 
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
                              {((currentProfileId && r.user_id === currentProfileId) || r.user_id === user?.id) && (
                                <button
                                  className="text-red-500 hover:text-red-600"
                                  onClick={() => handleDeleteReply(r.id)}
                                >
                                  Delete
                                </button>
                              )}
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
      
      const { data, error } = await callRpc('delete_post_ext', {
        post_id_param: postId,
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


