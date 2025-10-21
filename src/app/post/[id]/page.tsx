'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments'
import { PostStats } from '@/components/post-stats'
import supabase from '@/lib/supabase-client'

interface PostData {
  id: string
  title: string
  description?: string
  content_type: string
  created_at: string
  views: number
  creator_id: string
  creator_username?: string
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const postId = params.id as string

  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadPost()
  }, [postId])

  const loadPost = async () => {
    try {
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          content_type,
          created_at,
          views,
          creator_id,
          profiles!posts_creator_id_fkey (
            username
          )
        `)
        .eq('id', postId)
        .single()

      if (error) throw error

      const postWithProfile = postData as any
      setPost({
        id: postWithProfile.id,
        title: postWithProfile.title,
        description: postWithProfile.description,
        content_type: postWithProfile.content_type,
        created_at: postWithProfile.created_at,
        views: postWithProfile.views,
        creator_id: postWithProfile.creator_id,
        creator_username: postWithProfile.profiles?.username
      })

      // Check if current user owns this post
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single()
        
        if (profileData?.id === postWithProfile.creator_id) {
          setIsOwner(true)
        }
      }
    } catch (error) {
      console.error('Error loading post:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async () => {
    if (!isAuthenticated || !user?.id || !newComment.trim() || !post) return

    const content = newComment.trim()
    setNewComment('')

    // Add optimistic comment
    const optimistic: RealtimeComment = {
      id: `local-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: user.id,
      username: user.name || user.email || 'You',
      full_name: user.name || null,
      avatar_url: null,
      vote_score: 0,
      reply_count: 0
    }
    setOptimisticComments((prev) => [optimistic, ...prev])
    setCommentsRefreshSignal((n) => n + 1)

    try {
      await supabase.rpc('add_comment_ext', {
        post_id_param: post.id,
        external_id_param: user.id,
        content_param: content
      })
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const handleDeletePost = async () => {
    if (!isOwner || !post || !user?.id) return
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_post_ext', {
        post_id_param: post.id,
        external_id_param: user.id
      })

      if (error) {
        throw error
      }

      // Redirect to feed after successful deletion
      router.push('/feed')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">Loading post...</div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-8">
          <div className="text-gray-500">Post not found</div>
        </div>
      </div>
    )
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
    <div className="w-full min-h-screen bg-white" style={{ margin: 0, padding: 0 }}>
      <div className="max-w-4xl mx-auto p-6 bg-white" style={{ margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-black mb-4"
        >
          ← Back
        </button>
        
        {/* Post Header - Reddit Style */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h1 className="text-2xl font-['Space_Mono'] font-bold text-black mb-4">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
            <span>Posted by {post.creator_username || 'Unknown'}</span>
            <span>•</span>
            <span>{getTimeAgo(post.created_at)}</span>
            <span>•</span>
            <span>{post.views} views</span>
          </div>

          {post.description && (
            <div className="prose max-w-none">
              <p className="text-gray-800 whitespace-pre-wrap font-['Space_Mono']">
                {post.description}
              </p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <PostStats postId={post.id} initialViews={post.views} showDetailed />
            {isOwner && (
              <button
                onClick={handleDeletePost}
                disabled={deleting}
                className="px-3 py-2 text-sm border border-red-500 text-red-600 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete Post'}
              </button>
            )}
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
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-3 border border-gray-300 rounded-lg resize-none text-black bg-white"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim()}
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
        <RedditStyleCommentsList 
          postId={post.id}
          refreshSignal={commentsRefreshSignal}
          optimisticComments={optimisticComments}
        />
      </div>
      </div>
    </div>
  )
}

function RedditStyleCommentsList({ postId, refreshSignal, optimisticComments }: { 
  postId: string
  refreshSignal: number
  optimisticComments: RealtimeComment[]
}) {
  const { comments, loading, refetch } = useRealtimeComments(postId)
  const [merged, setMerged] = useState<RealtimeComment[]>([])
  const [replies, setReplies] = useState<Record<string, RealtimeComment[]>>({})
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({})
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [visibleReplies, setVisibleReplies] = useState<Set<string>>(new Set())
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (postId) refetch()
  }, [refreshSignal, postId, refetch])

  useEffect(() => {
    const server = comments || []
    const optimistic = optimisticComments || []
    if (optimistic.length === 0) {
      setMerged(server)
      return
    }
    const filteredOptimistic = optimistic.filter(o => 
      !server.some(s => 
        s.content === o.content && 
        Math.abs(new Date(s.created_at).getTime() - new Date(o.created_at).getTime()) < 60000
      )
    )
    setMerged([...filteredOptimistic, ...server])
  }, [comments, optimisticComments])


  const loadReplies = async (commentId: string) => {
    if (loadingReplies[commentId] || replies[commentId] !== undefined) return

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
      console.error('Failed to load replies:', error)
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }))
    }
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

  if (loading && merged.length === 0) {
    return <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">Loading comments...</div>
  }
  if (merged.length === 0) {
    return <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">No comments yet. Be the first to comment!</div>
  }

  const updateCommentVoteScore = (commentId: string, newVoteScore: number) => {
    setMerged(prev => prev.map(c => 
      c.id === commentId ? { ...c, vote_score: newVoteScore } : c
    ))
    // Also update replies if they exist
    setReplies(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(parentId => {
        updated[parentId] = updated[parentId].map(r => 
          r.id === commentId ? { ...r, vote_score: newVoteScore } : r
        )
      })
      return updated
    })
  }

  return (
    <div className="space-y-4">
      {merged.map((comment) => (
        <RedditComment
          key={comment.id}
          comment={comment}
          depth={0}
          onReply={(content: string) => {
            if (!isAuthenticated || !user?.id) return
            // Implementation will be added
          }}
          replies={replies[comment.id] || []}
          loadingReplies={loadingReplies[comment.id]}
          loadReplies={() => loadReplies(comment.id)}
          openReplyFor={openReplyFor}
          setOpenReplyFor={setOpenReplyFor}
          replyText={replyText}
          setReplyText={setReplyText}
          refetch={refetch}
          updateVoteScore={updateCommentVoteScore}
          visibleReplies={visibleReplies}
          setVisibleReplies={setVisibleReplies}
          likedComments={likedComments}
          setLikedComments={setLikedComments}
        />
      ))}
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
  setLikedComments
}: { 
  comment: RealtimeComment
  depth: number
  onReply: (content: string) => void
  replies: RealtimeComment[]
  loadingReplies: boolean
  loadReplies: () => void
  openReplyFor: string | null
  setOpenReplyFor: (id: string | null) => void
  replyText: Record<string, string>
  setReplyText: (text: Record<string, string>) => void
  refetch?: () => void
  updateVoteScore?: (commentId: string, newVoteScore: number) => void
  visibleReplies: Set<string>
  setVisibleReplies: (setter: (prev: Set<string>) => Set<string>) => void
  likedComments: Set<string>
  setLikedComments: (setter: (prev: Set<string>) => Set<string>) => void
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
          
          {/* Comment actions with likes */}
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            {/* Show/Hide replies button */}
            {comment.reply_count && comment.reply_count > 0 && (
              <button
                className="hover:text-black"
                onClick={async () => {
                  const newVisibleReplies = new Set(visibleReplies);
                  if (newVisibleReplies.has(comment.id)) {
                    newVisibleReplies.delete(comment.id);
                    setVisibleReplies(() => newVisibleReplies);
                  } else {
                    newVisibleReplies.add(comment.id);
                    setVisibleReplies(() => newVisibleReplies);
                    // Load replies if not already loaded
                    if (!(comment.id in replies)) {
                      loadReplies();
                    }
                  }
                }}
              >
                {visibleReplies.has(comment.id) ? 'Hide replies' : 'Show replies'}{typeof comment.reply_count === 'number' ? ` (${comment.reply_count})` : ''}
              </button>
            )}
            
            {/* Reply button */}
            <button
              className="hover:text-black"
              onClick={() => {
                if (openReplyFor === comment.id) {
                  setOpenReplyFor(null);
                } else {
                  setOpenReplyFor(comment.id);
                }
              }}
            >
              Reply
            </button>
            
            {/* Like button */}
            <button
              className={`flex items-center gap-1 transition-all duration-200 ${
                likedComments.has(comment.id)
                  ? 'text-red-500'
                  : 'hover:text-red-500'
              }`}
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
                      if (refetch) refetch();
                      return;
                    }
                  }
                  
                  // Update both the vote score and liked status from the response
                  if (responseData && typeof responseData.vote_score === 'number' && typeof responseData.liked === 'boolean') {
                    if (updateVoteScore) {
                      updateVoteScore(comment.id, responseData.vote_score);
                    }
                    
                    // Update liked comments state
                    setLikedComments(prev => {
                      const next = new Set(prev);
                      if (responseData.liked) {
                        next.add(comment.id);
                      } else {
                        next.delete(comment.id);
                      }
                      return next;
                    });
                  } else {
                    console.log('No vote_score or liked in response, refetching...');
                    if (refetch) {
                      // Fallback: refetch if response doesn't have expected fields
                      refetch();
                    }
                  }
                } catch (error) {
                  console.error('Error toggling comment vote:', error);
                }
              }}
            >
              <svg 
                className={`w-4 h-4 ${likedComments.has(comment.id) ? 'text-red-500' : 'text-gray-600'}`} 
                fill={likedComments.has(comment.id) ? 'currentColor' : 'none'} 
                stroke={likedComments.has(comment.id) ? 'currentColor' : 'currentColor'} 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{comment.vote_score || 0}</span>
            </button>
          </div>

          {/* Reply input */}
          {openReplyFor === comment.id && isAuthenticated && user?.id && (
            <div className="mt-3 border border-gray-200 rounded-lg p-3">
              <textarea
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                placeholder="Write a reply..."
                className="w-full p-2 text-sm border border-gray-300 rounded resize-none text-black bg-white"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={async () => {
                    const content = replyText[comment.id]?.trim();
                    if (!content || !user?.id) return;
                    
                    setReplyText({ ...replyText, [comment.id]: '' });
                    try {
                      await supabase.rpc('add_reply_ext', { 
                        comment_id_param: comment.id, 
                        external_id_param: user.id, 
                        content_param: content 
                      });
                      if (loadReplies) loadReplies();
                      if (refetch) refetch();
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
                    setReplyText({ ...replyText, [comment.id]: '' });
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
          )}

          {/* Show replies */}
          {visibleReplies.has(comment.id) && (replies.length > 0 || loadingReplies) && (
            <div className="mt-3">
              {loadingReplies ? (
                <div className="text-xs text-gray-500">Loading replies...</div>
              ) : (
                <div className="space-y-3">
                  {replies.map(reply => (
                    <RedditComment
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      onReply={onReply}
                      replies={[]}
                      loadingReplies={false}
                      loadReplies={() => {}}
                      openReplyFor={openReplyFor}
                      setOpenReplyFor={setOpenReplyFor}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      refetch={refetch}
                      updateVoteScore={updateVoteScore}
                      visibleReplies={visibleReplies}
                      setVisibleReplies={setVisibleReplies}
                      likedComments={likedComments}
                      setLikedComments={setLikedComments}
                    />
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
