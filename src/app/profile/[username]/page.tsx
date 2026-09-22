/**
 * Public Profile Page
 * View other users' profiles
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { usePosts } from '@/context/post-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { PostStats } from '@/components/post-stats'
import { useToast } from '@/hooks/use-toast'
import DetailModal from '@/components/detail-modal'
import { CollaborationButton } from '@/components/collab/CollaborationButton'
import { MessageButton } from '@/components/messages/MessageButton'
import { isPitchMode } from '@/lib/pitch-mode'
import { seedPostOpen } from '@/lib/pitch-nav'

interface UserPost {
  id: string
  title: string
  media_url: string
  content_type: string
  views: number
  like_count: number
  comment_count: number
  created_at: string
  description?: string
  audio_url?: string
  video_url?: string
  subgroup_id?: string
  subgroup_name?: string
  subgroup_slug?: string
}

interface UserStats {
  post_count: number
  follower_count: number
  following_count: number
  total_likes: number
  total_views: number
}

interface ProfileData {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser, loading: authLoading } = useAuth()
  const { setSelectedCard, setShowDetailModal, trackView } = usePosts()
  const toast = useToast()
  const pitchMode = isPitchMode()
  // Decode URL-encoded username and trim whitespace
  const username = decodeURIComponent(params.username as string).trim()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [displayedPosts, setDisplayedPosts] = useState<UserPost[]>([])
  const [avatarBroken, setAvatarBroken] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading before attempting profile load
    if (!authLoading) {
      loadProfile()
    }
  }, [username, authLoading])

  // Load current user's profile ID for comparison
  useEffect(() => {
    const loadCurrentUserProfileId = async () => {
      if (currentUser?.id) {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('external_id', currentUser.id)
            .maybeSingle()
          
          if (!error && profileData) {
            setCurrentUserProfileId(profileData.id)
          } else {
            setCurrentUserProfileId(null)
          }
        } catch (error) {
          console.error('Failed to load current user profile ID:', error)
          setCurrentUserProfileId(null)
        }
      } else {
        setCurrentUserProfileId(null)
      }
    }
    
    loadCurrentUserProfileId()
  }, [currentUser?.id])

  const loadProfile = async () => {
    try {
      setLoading(true)
      
      // Get user by username (case-insensitive via RPC)
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_profile_by_username', { username_param: username })
        .maybeSingle() as { data: ProfileData | null; error: any }

      if (profileError) {
        console.error('Profile lookup error:', profileError)
        toast.error('Error loading profile')
        setLoading(false)
        router.push('/feed')
        return
      }

      if (!profileData) {
        console.error('Profile not found for username:', username)
        console.error('RPC call parameters:', { username_param: username })
        console.error('RPC error:', profileError)
        toast.error(`User "${username}" not found`)
        setLoading(false)
        router.push(isPitchMode() ? '/' : '/feed')
        return
      }

      setProfile(profileData)

      // Track profile view
      if (currentUser?.id) {
        try {
          await callRpc('track_profile_view', {
            profile_id_param: profileData.id,
          })
        } catch (error) {
          console.error('Failed to track profile view:', error)
        }
      }

      // Load stats
      try {
        const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
          user_id_param: profileData.id
        })
        if (!statsError && statsData) {
          setStats(statsData)
        }
      } catch (statsError) {
        console.warn('Failed to load user stats:', statsError)
      }

      // Load posts with subgroup information
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, title, media_url, content_type, views, created_at, description, audio_url, video_url, subgroup_id, subgroups(name, slug)')
        .eq('creator_id', profileData.id)
        .order('created_at', { ascending: false })

      if (postsError) {
        console.error('Failed to load posts:', postsError)
      } else if (postsData) {
        const postsWithStats = await Promise.all(
          postsData.map(async (post) => {
            try {
              const [likesResult, commentsResult] = await Promise.all([
                supabase.rpc('get_like_count', { post_id_param: post.id }),
                supabase.rpc('get_comment_count', { post_id_param: post.id })
              ])
              return {
                ...post,
                like_count: likesResult.data || 0,
                comment_count: commentsResult.data || 0,
                subgroup_name: (post.subgroups as any)?.[0]?.name || null,
                subgroup_slug: (post.subgroups as any)?.[0]?.slug || null
              }
            } catch (statsError) {
              console.warn('Failed to load stats for post:', post.id, statsError)
              return {
                ...post,
                like_count: 0,
                comment_count: 0,
                subgroup_name: (post.subgroups as any)?.[0]?.name || null,
                subgroup_slug: (post.subgroups as any)?.[0]?.slug || null
              }
            }
          })
        )
        setPosts(postsWithStats)
        setDisplayedPosts(postsWithStats)
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error)
      toast.error('Failed to load profile: ' + (error.message || 'Please try again'))
    } finally {
      setLoading(false)
    }
  }

  // Function to refresh posts after deletion
  const refreshPosts = useCallback(async () => {
    if (!profile) return
    
    try {
      // Load posts with subgroup information
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, media_url, content_type, views, created_at, description, audio_url, video_url, subgroup_id, subgroups(name, slug)')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false })

      if (postsData) {
        const postsWithStats = await Promise.all(
          postsData.map(async (post) => {
            try {
              const [likesResult, commentsResult] = await Promise.all([
                supabase.rpc('get_like_count', { post_id_param: post.id }),
                supabase.rpc('get_comment_count', { post_id_param: post.id })
              ])
              return {
                ...post,
                like_count: likesResult.data || 0,
                comment_count: commentsResult.data || 0,
                subgroup_name: (post.subgroups as any)?.[0]?.name || null,
                subgroup_slug: (post.subgroups as any)?.[0]?.slug || null
              }
            } catch (statsError) {
              console.warn('Failed to load stats for post:', post.id, statsError)
              return {
                ...post,
                like_count: 0,
                comment_count: 0,
                subgroup_name: (post.subgroups as any)?.[0]?.name || null,
                subgroup_slug: (post.subgroups as any)?.[0]?.slug || null
              }
            }
          })
        )
        setPosts(postsWithStats)
        setDisplayedPosts(postsWithStats)
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error)
      toast.error('Failed to refresh posts')
    }
  }, [profile])

  // Handle sorting
  const handleSort = (mode: 'newest' | 'oldest' | 'most_liked') => {
    setSortMode(mode)
    let sorted = [...posts]
    
    switch (mode) {
      case 'newest':
        sorted = sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        sorted = sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'most_liked':
        sorted = sorted.sort((a, b) => b.like_count - a.like_count)
        break
    }
    
    setDisplayedPosts(sorted)
  }

  // Update displayed posts when posts or sort mode changes
  useEffect(() => {
    if (posts.length > 0) {
      handleSort(sortMode)
    }
  }, [posts, sortMode])

  // Optimized post click handler - handle text posts like feed page
  const handlePostClick = useCallback(async (post: UserPost) => {
    try {
      console.log('Post clicked:', post.id)
      await trackView(post.id)
      
      // For text posts, redirect to Reddit-style forum page like feed page does
      if (post.content_type === 'text') {
        router.push(`/post/${post.id}`)
        return
      }
      
      setSelectedCard({
        id: post.id,
        type: (post.content_type as any) || 'image',
        title: post.title,
        description: post.description,
        imageUrl: post.media_url || '',
        aspectRatio: 'square' as const,
        audioUrl: post.audio_url,
        videoUrl: post.video_url,
        creator: profile?.username || '',
        date: post.created_at,
        views: post.views,
        subgroupName: post.subgroup_name,
        subgroupSlug: post.subgroup_slug,
        tags: [],
      })
      console.log('Setting detail modal to true')
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to open post detail:', error)
    }
  }, [trackView, setSelectedCard, setShowDetailModal, profile?.username, router])

  // Check if viewing own profile - compare profile UUIDs properly
  const isOwnProfile = Boolean(
    profile && currentUserProfileId && currentUserProfileId === profile.id
  )

  // Own profile in pitch mode lives at /profile — avoid the old public chrome
  useEffect(() => {
    if (pitchMode && isOwnProfile) {
      router.replace('/profile')
    }
  }, [pitchMode, isOwnProfile, router])

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-wide text-black/40">Loading…</p>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  if (pitchMode && isOwnProfile) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-wide text-black/40">Opening profile…</p>
      </div>
    )
  }

  const openPost = (post: UserPost) => {
    if (pitchMode) {
      seedPostOpen({
        id: post.id,
        title: post.title,
        description: post.description,
        content_type: post.content_type,
        media_url: post.media_url,
        audio_url: post.audio_url,
        video_url: post.video_url,
        created_at: post.created_at,
        views: post.views,
        creator_username: profile.username,
        subgroup_name: post.subgroup_name,
        subgroup_slug: post.subgroup_slug,
        subgroup_id: post.subgroup_id,
      })
      router.push(`/post/${post.id}`)
      return
    }
    handlePostClick(post)
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white text-black font-['Space_Mono']">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        {pitchMode && (
          <Link
            href="/"
            className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
          >
            ← Creative web
          </Link>
        )}

        <header className="border-b border-black pb-6 mb-6">
          <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
            Profile
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border border-black overflow-hidden flex items-center justify-center text-2xl sm:text-3xl uppercase bg-white shrink-0">
                {profile.avatar_url && !avatarBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarBroken(true)}
                  />
                ) : (
                  profile.username[0]?.toUpperCase() || '?'
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-normal uppercase tracking-tight break-words">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-xs text-black/45 mt-1 uppercase tracking-wide">
                  @{profile.username}
                </p>
                {profile.bio ? (
                  <p className="mt-2 text-sm text-black/65 max-w-md leading-relaxed normal-case tracking-normal">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>

            {isOwnProfile ? (
              <button
                type="button"
                onClick={() => router.push('/profile/edit')}
                className="border border-black px-4 py-2 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
              >
                Edit
              </button>
            ) : !pitchMode ? (
              <div className="flex flex-wrap gap-2">
                <CollaborationButton
                  targetUserId={profile.id}
                  targetUsername={profile.username}
                  currentUserProfileId={currentUserProfileId}
                />
                <MessageButton
                  targetUserId={profile.id}
                  currentUserProfileId={currentUserProfileId}
                />
              </div>
            ) : null}
          </div>

          {stats && (
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-wide text-black/50">
              <span>
                <span className="text-black">{stats.post_count || 0}</span> posts
              </span>
              {!pitchMode && (
                <>
                  <span>
                    <span className="text-black">{stats.follower_count || 0}</span>{' '}
                    followers
                  </span>
                  <span>
                    <span className="text-black">{stats.following_count || 0}</span>{' '}
                    following
                  </span>
                </>
              )}
              <span>
                <span className="text-black">
                  {(stats.total_likes || 0).toLocaleString()}
                </span>{' '}
                likes
              </span>
              <span>
                <span className="text-black">
                  {(stats.total_views || 0).toLocaleString()}
                </span>{' '}
                views
              </span>
            </div>
          )}
        </header>

        {posts.length > 0 && (
          <div className="flex items-center justify-end gap-2 mb-6">
            <span className="text-[10px] uppercase text-black/40">Sort</span>
            {(
              [
                ['newest', 'New'],
                ['oldest', 'Old'],
                ['most_liked', 'Liked'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSort(id)}
                className={`px-2.5 py-1 text-[10px] uppercase tracking-wide border border-black ${
                  sortMode === id
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="border border-dashed border-black/30 px-6 py-20 text-center">
            <p className="text-sm text-black/50">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-black">
            {(displayedPosts.length > 0 ? displayedPosts : posts).map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => openPost(post)}
                onMouseEnter={() => {
                  if (pitchMode) router.prefetch(`/post/${post.id}`)
                }}
                className="group text-left border-r border-b border-black p-3 hover:bg-black/[0.02]"
              >
                <div className="relative aspect-[4/3] overflow-hidden border border-black bg-white">
                  {post.media_url && post.content_type !== 'text' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.media_url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <h4 className="text-sm text-black line-clamp-3 text-center">
                        {post.title || 'Post'}
                      </h4>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide line-clamp-2">
                  {post.title}
                </p>
                <div className="mt-1">
                  <PostStats
                    postId={post.id}
                    initialViews={post.views}
                    initialLikes={post.like_count}
                    initialComments={post.comment_count}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      {!pitchMode && <DetailModal refetchPosts={refreshPosts} />}
    </div>
  )
}

