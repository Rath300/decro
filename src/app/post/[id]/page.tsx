'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments'
import { PostStats } from '@/components/post-stats'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useUserHistory } from '@/hooks/use-user-history'
import AddToSpotlightButton from '@/components/add-to-spotlight-button'
import { isPitchMode } from '@/lib/pitch-mode'
import { takePostSeed } from '@/lib/pitch-nav'
import {
  extractUbuArchiveUrl,
  isArchiveLinkPost,
  stripArchiveUrlLines,
} from '@/lib/archive-link'

interface PostData {
  id: string
  title: string
  description?: string
  content_type: string
  created_at: string
  views: number
  creator_id: string
  creator_username?: string
  media_url?: string
  audio_url?: string
  video_url?: string
  subgroup_id?: string | null
  subgroup_name?: string | null
  subgroup_slug?: string | null
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { trackAction } = useUserHistory()
  const postId = params.id as string

  const [post, setPost] = useState<PostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0)
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [guestUsername, setGuestUsername] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const pitchMode = isPitchMode()
  const canComment = isAuthenticated || pitchMode

  useEffect(() => {
    // Instant paint from navigation seed (web / grid), then refresh from DB
    const seed = takePostSeed(postId)
    if (seed) {
      setPost({
        id: seed.id,
        title: seed.title || 'Untitled',
        description: seed.description || '',
        content_type: seed.content_type || 'image',
        media_url: seed.media_url || '',
        audio_url: seed.audio_url || '',
        video_url: seed.video_url || '',
        created_at: seed.created_at || new Date().toISOString(),
        views: seed.views || 0,
        creator_id: seed.creator_id || '',
        creator_username: seed.creator_username || 'anonymous',
        subgroup_id: seed.subgroup_id || null,
        subgroup_name: seed.subgroup_name || null,
        subgroup_slug: seed.subgroup_slug || null,
      })
      setLoading(false)
    }
    void loadPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          media_url,
          audio_url,
          video_url,
          created_at,
          views,
          creator_id,
          subgroup_id,
          profiles!posts_creator_id_fkey (
            username
          ),
          subgroups (
            name,
            slug
          )
        `)
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Failed to load post:', error)
        throw error
      }
      
      if (!postData) {
        console.error('No post data returned')
        setPost(null)
        return
      }

      const postWithProfile = postData as any
      
      // Handle both single object and array profiles
      const profileUsername = Array.isArray(postWithProfile.profiles) 
        ? postWithProfile.profiles[0]?.username 
        : postWithProfile.profiles?.username
      
      const subgroup = Array.isArray(postWithProfile.subgroups)
        ? postWithProfile.subgroups[0]
        : postWithProfile.subgroups

      setPost({
        id: postWithProfile.id,
        title: postWithProfile.title || 'Untitled',
        description: postWithProfile.description || '',
        content_type: postWithProfile.content_type || 'text',
        media_url: postWithProfile.media_url || '',
        audio_url: postWithProfile.audio_url || '',
        video_url: postWithProfile.video_url || '',
        created_at: postWithProfile.created_at || new Date().toISOString(),
        views: postWithProfile.views || 0,
        creator_id: postWithProfile.creator_id || '',
        creator_username: profileUsername || 'Unknown',
        subgroup_id: postWithProfile.subgroup_id || null,
        subgroup_name: subgroup?.name || null,
        subgroup_slug: subgroup?.slug || null,
      })

      // Track view for this post
      if (user?.id) {
        trackAction('view', postId, 'post')
      }

      try {
        await callRpc('track_view', {
          post_id_param: postId,
          user_id_param: user?.id || null,
        })
      } catch {
        /* ignore view tracking failures */
      }

      // Check ownership
      if (user?.id && postWithProfile.creator_id) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('external_id', user.id)
            .maybeSingle()
          setIsOwner(Boolean(profile?.id && profile.id === postWithProfile.creator_id))
        } catch {
          setIsOwner(false)
        }
      }
    } catch (error) {
      console.error('Error loading post:', error)
      // Keep seed paint if we already have one
      setPost((prev) => prev)
    } finally {
      setLoading(false)
    }
  }

  const handleCommentSubmit = async () => {
    if (!canComment || !newComment.trim() || !post) return
    if (!pitchMode && !user?.id) return

    const content = newComment.trim()
    
    // Clear input immediately for better UX
    setNewComment('')

    try {
      const args: Record<string, unknown> = {
        post_id_param: post.id,
        content_param: content,
      }
      if (pitchMode && !isAuthenticated && guestUsername.trim()) {
        args.pitch_username = guestUsername.trim()
      }
      const { error } = await callRpc('add_comment_ext', args)
      
      if (error) {
        console.error('Failed to add comment:', error)
        throw error
      }
      
      // Trigger refresh of comments
      setCommentsRefreshSignal((n) => n + 1)
    } catch (error: any) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment: ' + (error.message || 'Please try again'))
      // Restore the comment text on error
      setNewComment(content)
    }
  }

  const handleDeletePost = async () => {
    if (!isOwner || !post || !user?.id) return
    
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { data, error } = await callRpc('delete_post_ext', {
        post_id_param: post.id,
      })

      if (error) {
        console.error('Delete RPC error:', error)
        throw error
      }
      
      if (data && !data.success) {
        throw new Error(data.error || 'Delete failed')
      }

      console.log('Post deleted successfully')
      router.push(pitchMode ? '/' : '/feed')
      router.refresh()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post: ' + (error.message || 'Please try again.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-wide text-black/40">Loading…</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-black/50 mb-4">Post not found</p>
          <Link
            href={pitchMode ? '/' : '/feed'}
            className="text-[10px] uppercase tracking-wide underline underline-offset-4"
          >
            {pitchMode ? '← Creative web' : '← Feed'}
          </Link>
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

  const backHref = post.subgroup_slug
    ? `/subgroup/${post.subgroup_slug}`
    : pitchMode
      ? '/'
      : '/feed'

  const archiveUrl = extractUbuArchiveUrl(post.description)
  const archivePost = isArchiveLinkPost({
    contentType: post.content_type,
    description: post.description,
    mediaUrl: post.media_url,
  })
  const bodyText = archivePost
    ? stripArchiveUrlLines(post.description || '')
    : post.description || ''
  const showMedia =
    !archivePost && Boolean(post.media_url || post.audio_url || post.video_url)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono']">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <Link
          href={backHref}
          className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
        >
          {post.subgroup_name
            ? `← ${post.subgroup_name}`
            : pitchMode
              ? '← Creative web'
              : '← Back'}
        </Link>

        <header className="border-b border-black pb-6 mb-8">
          <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
            {archivePost ? 'Archive link' : 'Post'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight">
            {post.title}
          </h1>
          <p className="mt-3 text-[10px] uppercase tracking-wide text-black/45 flex flex-wrap gap-x-2 gap-y-1">
            {(() => {
              const name = post.creator_username || 'anonymous'
              const linkable = !/^anonymous(_|$)/i.test(name)
              return linkable ? (
                <Link
                  href={`/profile/${encodeURIComponent(name)}`}
                  className="text-black underline underline-offset-4 hover:no-underline"
                >
                  {name}
                </Link>
              ) : (
                <span>{name}</span>
              )
            })()}
            <span>·</span>
            <span>{getTimeAgo(post.created_at)}</span>
            <span>·</span>
            <span>{post.views} views</span>
            {post.subgroup_slug && post.subgroup_name ? (
              <>
                <span>·</span>
                <Link
                  href={`/subgroup/${post.subgroup_slug}`}
                  className="text-black underline underline-offset-4 hover:no-underline"
                  onMouseEnter={() => router.prefetch(`/subgroup/${post.subgroup_slug}`)}
                >
                  in {post.subgroup_name}
                </Link>
              </>
            ) : null}
          </p>
        </header>

        {bodyText ? (
          <p className="text-sm text-black/70 whitespace-pre-wrap leading-relaxed mb-8">
            {bodyText}
          </p>
        ) : null}

        {archivePost && archiveUrl ? (
          <div className="mb-8 border border-black p-5 sm:p-6 space-y-4">
            <p className="text-[10px] uppercase tracking-wide text-black/45">
              External archive
            </p>
            <p className="text-sm text-black/70">
              Decro does not host this work. Open the original on UbuWeb.
            </p>
            <a
              href={archiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center border border-black bg-black text-white px-5 py-3 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
            >
              Open on UbuWeb →
            </a>
          </div>
        ) : null}

        {showMedia ? (
          <div className="mb-8 border border-black">
            {post.content_type === 'music' && post.audio_url ? (
              <div className="relative bg-black/[0.02]">
                {post.media_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.media_url}
                    alt={post.title}
                    className="w-full max-h-[28rem] object-cover"
                  />
                ) : null}
                <div className="p-4 border-t border-black">
                  <audio controls className="w-full">
                    <source src={post.audio_url} type="audio/mpeg" />
                  </audio>
                </div>
              </div>
            ) : ['video', 'film'].includes(post.content_type) && post.video_url ? (
              <video
                src={post.video_url}
                controls
                className="w-full max-h-[32rem] bg-black"
                poster={post.media_url}
              />
            ) : post.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.media_url}
                alt={post.title}
                className="w-full max-h-[36rem] object-contain bg-white"
              />
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black pb-6 mb-10">
          <PostStats postId={post.id} initialViews={post.views} showDetailed />
          <div className="flex items-center gap-2">
            {!pitchMode && <AddToSpotlightButton postId={post.id} />}
            {isOwner && (
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={deleting}
                className="border border-black px-4 py-2 text-[10px] uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        <section>
          <h2 className="text-[10px] uppercase tracking-wide text-black/45 mb-4">
            Comments
          </h2>

          {canComment ? (
            <div className="mb-8 space-y-3">
              {pitchMode && !isAuthenticated && (
                <input
                  type="text"
                  value={guestUsername}
                  onChange={(e) => setGuestUsername(e.target.value)}
                  placeholder="Username (optional)"
                  className="w-full border border-black px-3 py-2.5 text-sm bg-white outline-none"
                  maxLength={24}
                />
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment…"
                className="w-full border border-black px-3 py-2.5 text-sm bg-white outline-none resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="border border-black bg-black text-white px-5 py-2 text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
                >
                  Comment
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-8 text-sm text-black/50 border border-black px-4 py-3">
              Sign in to comment
            </p>
          )}

          <RedditStyleCommentsList
            postId={post.id}
            refreshSignal={commentsRefreshSignal}
            optimisticComments={optimisticComments}
            guestUsername={guestUsername}
            canReply={canComment}
          />
        </section>
      </main>
    </div>
  )
}

function RedditStyleCommentsList({
  postId,
  refreshSignal,
  optimisticComments,
  guestUsername,
  canReply,
}: { 
  postId: string
  refreshSignal: number
  optimisticComments: RealtimeComment[]
  guestUsername: string
  canReply: boolean
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
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)

  // Fetch current user's profile ID for ownership checks
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCurrentUserProfileId(null)
      return
    }
    
    const fetchProfileId = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single()
        
        if (!error && data) {
          setCurrentUserProfileId(data.id)
        }
      } catch (error) {
        console.error('Failed to fetch current user profile ID:', error)
      }
    }
    
    fetchProfileId()
  }, [isAuthenticated, user?.id])

  useEffect(() => {
    if (postId) refetch()
  }, [refreshSignal, postId, refetch])

  useEffect(() => {
    const server = comments || []
    const optimistic = optimisticComments || []

    // Drop empty / garbage rows; keep guest and anonymous display names.
    const filterValidComments = (commentsList: RealtimeComment[]) => {
      return commentsList.filter((comment) => {
        // Top-level only — replies load under Show replies
        if ((comment as any).parent_id) return false
        if (!comment.username?.trim() && !comment.full_name?.trim()) return false
        if (comment.created_at < '2020-01-01') return false
        return true
      })
    }

    const validServerComments = filterValidComments(server)
    const validOptimisticComments = filterValidComments(optimistic)
    const serverIds = new Set(validServerComments.map((c) => c.id))

    // Prefer server rows; keep optimistic only until the real row lands.
    const filteredOptimistic = validOptimisticComments.filter(
      (o) =>
        !serverIds.has(o.id) &&
        !validServerComments.some(
          (s) =>
            s.content === o.content &&
            Math.abs(
              new Date(s.created_at).getTime() - new Date(o.created_at).getTime()
            ) < 60_000
        )
    )

    const mergedList = [...filteredOptimistic, ...validServerComments]
    const seen = new Set<string>()
    setMerged(
      mergedList.filter((c) => {
        if (!c.id || seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
    )
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


  const loadReplies = async (commentId: string, force = false) => {
    if (!force && (loadingReplies[commentId] || replies[commentId] !== undefined)) return

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
    return (
      <p className="text-[10px] uppercase tracking-wide text-black/40 py-4">
        Loading comments…
      </p>
    )
  }
  if (merged.length === 0) {
    return (
      <p className="text-sm text-black/45 py-4">
        No comments yet. Be the first.
      </p>
    )
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
          loadReplies={(force?: boolean) => loadReplies(comment.id, force)}
          openReplyFor={openReplyFor}
          setOpenReplyFor={setOpenReplyFor}
          replyText={replyText}
          setReplyText={setReplyText}
          refetch={refetch}
          onDeleted={(id) => {
            setMerged((prev) => prev.filter((c) => c.id !== id))
            setReplies((prev) => {
              const next = { ...prev }
              delete next[id]
              for (const key of Object.keys(next)) {
                next[key] = next[key].filter((r) => r.id !== id)
              }
              return next
            })
            void refetch()
          }}
          updateVoteScore={updateCommentVoteScore}
          visibleReplies={visibleReplies}
          setVisibleReplies={setVisibleReplies}
          likedComments={likedComments}
          setLikedComments={setLikedComments}
          currentUserProfileId={currentUserProfileId}
          canReply={canReply}
          guestUsername={guestUsername}
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
  onDeleted,
  updateVoteScore,
  visibleReplies,
  setVisibleReplies,
  likedComments,
  setLikedComments,
  currentUserProfileId,
  canReply,
  guestUsername,
}: { 
  comment: RealtimeComment
  depth: number
  onReply: (content: string) => void
  replies: RealtimeComment[]
  loadingReplies: boolean
  loadReplies: (force?: boolean) => void
  openReplyFor: string | null
  setOpenReplyFor: (id: string | null) => void
  replyText: Record<string, string>
  setReplyText: (text: Record<string, string>) => void
  refetch?: () => void
  onDeleted?: (commentId: string) => void
  updateVoteScore?: (commentId: string, newVoteScore: number) => void
  visibleReplies: Set<string>
  setVisibleReplies: (setter: (prev: Set<string>) => Set<string>) => void
  likedComments: Set<string>
  setLikedComments: (setter: (prev: Set<string>) => Set<string>) => void
  currentUserProfileId?: string | null
  canReply: boolean
  guestUsername: string
}) {
  const { isAuthenticated, user } = useAuth()
  const pitchMode = isPitchMode()
  const canVote = isAuthenticated || pitchMode
  const maxDepth = 2
  const isCommentOwner = currentUserProfileId && currentUserProfileId === comment.user_id

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
    <div className={`${depth > 0 ? 'ml-4 sm:ml-6 border-l border-black/20 pl-4' : ''}`}>
      <div className="py-3">
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-xs uppercase tracking-wide text-black">
            {comment.full_name?.trim() || comment.username || 'anonymous'}
          </span>
          {(comment as any).replying_to_username && (
            <span className="text-[10px] uppercase tracking-wide text-black/35">
              → {(comment as any).replying_to_username}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wide text-black/35">
            {getTimeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-black/80 mb-2 break-words leading-relaxed">
          {comment.content}
        </p>
          
          {/* Comment actions with likes */}
          <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wide text-black/45">
            {/* Delete button (owner only) - compare profile IDs */}
            {isCommentOwner && (
              <button
                className="text-red-500 hover:text-red-700 font-['Space_Mono'] transition-colors font-medium"
                onClick={async () => {
                  if (!user?.id) {
                    alert('You must be logged in')
                    return
                  }
                  if (!confirm('Delete this comment?')) return
                  // Optimistic remove — don't wait on refetch/realtime
                  onDeleted?.(comment.id)
                  try {
                    const { data, error } = await callRpc('delete_comment_ext', {
                      comment_id_param: comment.id,
                    })
                    if (error) throw error
                    let result = data as any
                    if (typeof result === 'string') {
                      try {
                        result = JSON.parse(result)
                      } catch {
                        /* keep string */
                      }
                    }
                    if (result && result.success === false) {
                      alert(result.error || 'Failed to delete')
                      if (refetch) void refetch()
                    }
                  } catch (error) {
                    console.error('Delete failed:', error)
                    alert('Failed to delete comment')
                    if (refetch) void refetch()
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
                if (!canVote) return;
                try {
                  const { data, error: rpcError } = await callRpc('toggle_comment_vote_ext', { 
                    comment_id_param: comment.id, 
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
          {openReplyFor === comment.id && canReply && (
            <div className="mt-3 border border-black p-3 space-y-2">
              <textarea
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                placeholder="Write a reply…"
                className="w-full px-3 py-2 text-sm border border-black outline-none resize-none bg-white"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const content = replyText[comment.id]?.trim()
                    if (!content) return

                    setReplyText({ ...replyText, [comment.id]: '' })
                    setOpenReplyFor(null)
                    try {
                      const args: Record<string, unknown> = {
                        comment_id_param: comment.id,
                        content_param: content,
                      }
                      if (!isAuthenticated && guestUsername.trim()) {
                        args.pitch_username = guestUsername.trim()
                      }
                      const { error } = await callRpc('add_reply_ext', args)
                      if (error) throw error
                      setVisibleReplies((prev) => {
                        const next = new Set(prev)
                        next.add(comment.id)
                        return next
                      })
                      await loadReplies(true)
                      if (refetch) refetch()
                    } catch (error: any) {
                      console.error('Error adding reply:', error)
                      alert('Failed to add reply: ' + (error?.message || 'Please try again'))
                      setReplyText({ ...replyText, [comment.id]: content })
                    }
                  }}
                  className="border border-black bg-black text-white px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-white hover:text-black"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyText({ ...replyText, [comment.id]: '' })
                    setOpenReplyFor(null)
                  }}
                  className="border border-black px-3 py-1.5 text-[10px] uppercase tracking-wide hover:bg-black hover:text-white"
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
                <p className="text-[10px] uppercase tracking-wide text-black/40">
                  Loading replies…
                </p>
              ) : (
                <div className="space-y-1">
                  {replies.map((reply) => (
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
                      onDeleted={onDeleted}
                      updateVoteScore={updateVoteScore}
                      visibleReplies={visibleReplies}
                      setVisibleReplies={setVisibleReplies}
                      likedComments={likedComments}
                      setLikedComments={setLikedComments}
                      currentUserProfileId={currentUserProfileId}
                      canReply={canReply}
                      guestUsername={guestUsername}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
