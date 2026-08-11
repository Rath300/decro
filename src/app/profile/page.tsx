/**
 * User Profile Page (Own Profile)
 * Shows user's posts, stats, and edit button
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { PostStats } from '@/components/post-stats'
import { usePosts } from '@/context/post-context'
import DetailModal from '@/components/detail-modal'
import { NetworkView } from '@/components/collab/NetworkView'
import { CollaborationRequests } from '@/components/collab/CollaborationRequests'
import { isPitchMode } from '@/lib/pitch-mode'

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

export default function ProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const pitchMode = isPitchMode()
  const { setSelectedCard, setShowDetailModal, trackView } = usePosts()
  const [posts, setPosts] = useState<UserPost[]>([])
  const [likedPosts, setLikedPosts] = useState<UserPost[]>([])
  const [spotlights, setSpotlights] = useState<any[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'spotlights' | 'network' | 'requests'>('posts')
  const [username, setUsername] = useState<string>('')
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [displayedPosts, setDisplayedPosts] = useState<UserPost[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string>('')
  const [bio, setBio] = useState<string>('')
  const [avatarBroken, setAvatarBroken] = useState(false)

  // Function to refresh posts after deletion
  const refreshPosts = useCallback(async () => {
    if (!user?.id) return
    
    try {
      // Map external auth id -> profiles.id
      const { data: profileId, error: ensureErr } = await callRpc('ensure_profile', {
      })
      if (ensureErr) throw ensureErr

      // Load user posts with all necessary fields including subgroup info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          media_url,
          audio_url,
          video_url,
          content_type,
          views,
          created_at,
          subgroup_id,
          subgroups(name, slug)
        `)
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false })

      if (!postsError && postsData) {
        // Get like and comment counts for each post
        const postsWithStats = await Promise.all(
          postsData.map(async (post) => {
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
          })
        )

        setPosts(postsWithStats)
        setDisplayedPosts(postsWithStats)
      }
    } catch (error) {
      console.error('Failed to refresh posts:', error)
    }
  }, [user?.id])

  const loadLikedPosts = useCallback(async () => {
    if (!profileId) return

    try {
      // Get posts that the user has liked
      const { data: likedData, error: likedError } = await supabase
        .from('likes')
        .select(`
          post_id,
          posts!inner(
            id,
            title,
            description,
            media_url,
            audio_url,
            video_url,
            content_type,
            views,
            created_at,
            subgroup_id,
            subgroups(name, slug)
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })

      if (!likedError && likedData) {
        const likedPostsWithStats = await Promise.all(
          likedData.map(async (like: any) => {
            const post = like.posts
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
          })
        )

        setLikedPosts(likedPostsWithStats)
      }
    } catch (error) {
      console.error('Failed to load liked posts:', error)
    }
  }, [profileId])

  const loadSpotlights = useCallback(async () => {
    if (!profileId) return

    try {
      const { data: spotlightsData, error: spotlightsError } = await supabase
        .from('spotlight_collections')
        .select('*')
        .eq('creator_id', profileId)
        .order('created_at', { ascending: false })

      if (!spotlightsError && spotlightsData) {
        setSpotlights(spotlightsData)
      }
    } catch (error) {
      console.error('Failed to load spotlights:', error)
    }
  }, [profileId])

  const loadProfile = useCallback(async () => {
    if (!user?.id) return

    try {
      // Map external auth id -> profiles.id and get username
      const { data: userId, error: ensureErr } = await callRpc('ensure_profile', {
      })
      if (ensureErr) throw ensureErr

      setProfileId(userId)

      // Get profile fields including avatar
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, bio, avatar_url')
        .eq('id', userId)
        .single()
      
      if (profileData?.username) {
        setUsername(profileData.username)
      }
      setFullName(profileData?.full_name || '')
      setBio(profileData?.bio || '')
      setAvatarUrl(profileData?.avatar_url || null)
      setAvatarBroken(false)

      // Load user stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
        user_id_param: userId
      })

      if (!statsError && statsData) {
        setStats(statsData)
      }

      // Load user posts with all necessary fields including subgroup info
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          media_url,
          audio_url,
          video_url,
          content_type,
          views,
          created_at,
          subgroup_id,
          subgroups(name, slug)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })

      if (!postsError && postsData) {
        // Get like and comment counts for each post
        const postsWithStats = await Promise.all(
          postsData.map(async (post) => {
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
          })
        )

        setPosts(postsWithStats)
        // Initialize displayed posts with the same data
        setDisplayedPosts(postsWithStats)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading before deciding what to do
    if (authLoading) return
    
    if (!isAuthenticated) {
      // Redirect to feed if not authenticated (since /profile requires auth)
      router.push('/feed')
      return
    }

    if (!user?.id) return

    loadProfile()
  }, [user?.id, isAuthenticated, authLoading, loadProfile, router])

  // Load content based on active tab
  useEffect(() => {
    if (!profileId) return

    if (activeTab === 'liked') {
      loadLikedPosts()
    } else if (activeTab === 'spotlights') {
      loadSpotlights()
    }
  }, [activeTab, profileId, loadLikedPosts, loadSpotlights])

  // Handle sorting
  const handleSort = (mode: 'newest' | 'oldest' | 'most_liked') => {
    setSortMode(mode)
    
    // Get the appropriate data source based on active tab
    let sourceData = activeTab === 'liked' ? likedPosts : posts
    let sorted = [...sourceData]
    
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

  // Update displayed posts when posts, liked posts, sort mode, or active tab changes
  useEffect(() => {
    handleSort(sortMode)
  }, [posts, likedPosts, sortMode, activeTab])

  // Optimized post click handler with useCallback - handle text posts like feed page
  const handlePostClick = useCallback(async (post: UserPost) => {
    try {
      // Validate post has required fields
      if (!post || !post.id) {
        console.error('Invalid post data:', post)
        return
      }
      
      // Track view (with error handling)
      try {
        await trackView(post.id)
      } catch (trackError) {
        console.warn('Failed to track view:', trackError)
        // Continue anyway - don't block UI for tracking failure
      }
      
      // For text posts, redirect to Reddit-style forum page like feed page does
      if (post.content_type === 'text') {
        router.push(`/post/${post.id}`)
        return
      }
      
      // Set selected card with complete data for other content types
      setSelectedCard({
        id: post.id,
        type: (post.content_type as any) || 'image',
        title: post.title || 'Untitled',
        description: post.description || '',
        imageUrl: post.media_url || '',
        aspectRatio: 'square' as const,
        audioUrl: post.audio_url || undefined,
        videoUrl: post.video_url || undefined,
        creator: username || user?.email?.split('@')[0] || 'Anonymous',
        date: post.created_at || new Date().toISOString(),
        views: post.views || 0,
        subgroupName: post.subgroup_name || undefined,
        subgroupSlug: post.subgroup_slug || undefined,
        tags: [],
      })
      
      // Show modal
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to open post detail:', error)
      alert('Failed to open post. Please try again.')
    }
  }, [trackView, setSelectedCard, setShowDetailModal, username, user?.email, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white text-black font-['Space_Mono'] flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-black p-6 sm:p-8 bg-white">
          <p className="text-[10px] uppercase tracking-wide text-black/40">Profile</p>
          <h2 className="mt-2 text-xl font-normal uppercase tracking-tight">
            Log in to see your page
          </h2>
          <p className="mt-3 text-sm text-black/60 leading-relaxed">
            Your posts and likes live here once you have an account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="border border-black bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="border border-black px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const pitchTabs = (
    [
      ['posts', 'Posts'],
      ['liked', 'Liked'],
    ] as const
  )
  const fullTabs = (
    [
      ['posts', 'Posts'],
      ['liked', 'Liked'],
      ['spotlights', 'Spotlights'],
      ['network', 'Connections'],
      ['requests', 'Requests'],
    ] as const
  )
  const tabs = pitchMode ? pitchTabs : fullTabs

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
        {loading ? (
          <div className="text-center py-20">
            <p className="text-xs uppercase tracking-wide text-black/40">Loading…</p>
          </div>
        ) : (
          <>
            <header className="border-b border-black pb-6 mb-6">
              <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
                Profile
              </p>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 border border-black overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-normal uppercase bg-white shrink-0">
                    {avatarUrl && !avatarBroken ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={() => setAvatarBroken(true)}
                      />
                    ) : (
                      user?.name?.[0]?.toUpperCase() ||
                      username?.[0]?.toUpperCase() ||
                      user?.email?.[0]?.toUpperCase() ||
                      '?'
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-normal uppercase tracking-tight">
                      {fullName || user?.name || username || user?.email}
                    </h1>
                    <p className="text-xs text-black/45 mt-1 uppercase tracking-wide">
                      @{username || user?.email?.split('@')[0]}
                    </p>
                    {bio ? (
                      <p className="mt-2 text-sm text-black/65 max-w-md leading-relaxed normal-case tracking-normal">
                        {bio}
                      </p>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/profile/edit')}
                  className="border border-black px-4 py-2 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
                >
                  Edit
                </button>
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

              <div className="mt-6 flex flex-wrap border border-black w-fit">
                {tabs.map(([id, label], i) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs uppercase tracking-wide ${
                      activeTab === id
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-black/5'
                    } ${i > 0 ? 'border-l border-black' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </header>

            {(activeTab === 'posts' || activeTab === 'liked') && (
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

            {/* Network Tab Content */}
            {activeTab === 'network' ? (
              <NetworkView userId={profileId || undefined} />
            ) : activeTab === 'requests' ? (
              /* Requests Tab Content */
              <CollaborationRequests />
            ) : activeTab === 'spotlights' ? (
              /* Spotlights Tab Content */
              spotlights.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-300">
                  <p className="text-gray-600">No spotlights yet</p>
                  <button
                    onClick={() => router.push('/spotlight/create')}
                    className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800"
                  >
                    Create Your First Spotlight
                  </button>
                </div>
              ) : (
                <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
                  {spotlights.map((spotlight) => (
                    <div
                      key={spotlight.id}
                      className="break-inside-avoid mb-4 border border-gray-200 hover:border-black transition-colors p-4 cursor-pointer"
                      onClick={() => router.push(`/spotlight/${spotlight.id}`)}
                    >
                      <h3 className="font-bold text-black mb-2">{spotlight.title}</h3>
                      {spotlight.description && (
                        <p className="text-sm text-gray-600 line-clamp-3">{spotlight.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(spotlight.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Posts/Liked Grid - use masonry layout like feed page */
              <>
                {(activeTab === 'posts' ? posts : likedPosts).length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-black/30">
                    <p className="text-sm text-black/50">
                      {activeTab === 'posts' ? 'No posts yet' : 'No liked posts yet'}
                    </p>
                    {activeTab === 'posts' && (
                      <button
                        type="button"
                        onClick={() =>
                          pitchMode
                            ? window.dispatchEvent(new Event('pitch:open-upload'))
                            : router.push('/create')
                        }
                        className="mt-4 border border-black bg-black text-white px-5 py-2 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
                      >
                        {pitchMode ? 'Upload' : 'Create post'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                    <AnimatePresence>
                      {displayedPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        duration: 0.3, 
                        delay: index * 0.05,
                        ease: "easeOut"
                      }}
                      whileHover={{ 
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="group break-inside-avoid mb-4"
                    >
                    <button
                      className="relative block w-full aspect-square overflow-hidden border border-black/20 hover:border-black transition-colors"
                      onClick={() => handlePostClick(post)}
                    >
                      {post.media_url && post.content_type !== 'text' ? (
                        <img
                          src={post.media_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        // Text post or no media - show title as cover
                        <div className="w-full h-full bg-white border border-gray-200 flex items-center justify-center p-4">
                          <div className="text-center">
                            <h4 className="text-sm md:text-base font-['Space_Mono'] text-black line-clamp-2">{post.title || 'Post'}</h4>
                            {post.description && (
                              <p className="mt-2 text-xs md:text-sm text-gray-600 line-clamp-3">{post.description}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center">
                          <PostStats
                            postId={post.id}
                            initialViews={post.views}
                            initialLikes={post.like_count}
                            initialComments={post.comment_count}
                          />
                        </div>
                      </div>
                    </button>
                    {/* Always-visible compact stats below the tile */}
                    <div className="mt-1">
                      {post.subgroup_name && post.subgroup_slug && (
                        <div className="text-[10px] text-gray-500 mb-1 font-['Space_Mono']">
                          in <Link href={`/subgroup/${post.subgroup_slug}`} className="hover:text-blue-600 transition-colors">{post.subgroup_name}</Link>
                        </div>
                      )}
                      <PostStats
                        postId={post.id}
                        initialViews={post.views}
                        initialLikes={post.like_count}
                        initialComments={post.comment_count}
                      />
                    </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )
          }
        </>
      )}
    </>
  )}
</main>
<DetailModal refetchPosts={refreshPosts} />
</div>
)
}

