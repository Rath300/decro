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
import { PostStats } from '@/components/post-stats'
import { usePosts } from '@/context/post-context'
import DetailModal from '@/components/detail-modal'

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
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { setSelectedCard, setShowDetailModal, trackView } = usePosts()
  const [posts, setPosts] = useState<UserPost[]>([])
  const [likedPosts, setLikedPosts] = useState<UserPost[]>([])
  const [spotlights, setSpotlights] = useState<any[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'spotlights'>('posts')
  const [username, setUsername] = useState<string>('')
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [displayedPosts, setDisplayedPosts] = useState<UserPost[]>([])
  const [profileId, setProfileId] = useState<string | null>(null)

  // Function to refresh posts after deletion
  const refreshPosts = useCallback(async () => {
    if (!user?.id) return
    
    try {
      // Map external auth id -> profiles.id
      const { data: profileId, error: ensureErr } = await supabase.rpc('ensure_profile', {
        external_id_param: user.id,
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
      const { data: userId, error: ensureErr } = await supabase.rpc('ensure_profile', {
        external_id_param: user.id,
      })
      if (ensureErr) throw ensureErr

      setProfileId(userId)

      // Get username from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()
      
      if (profileData?.username) {
        setUsername(profileData.username)
      }

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
    if (!isAuthenticated) {
      // Show modal instead of redirecting
      setShowAuthModal(true)
      return
    }

    if (!user?.id) return

    loadProfile()
  }, [user?.id, isAuthenticated, loadProfile])

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
      // Track view
      await trackView(post.id)
      
      // For text posts, redirect to Reddit-style forum page like feed page does
      if (post.content_type === 'text') {
        router.push(`/post/${post.id}`)
        return
      }
      
      // Set selected card with complete data for other content types
      setSelectedCard({
        id: post.id,
        type: (post.content_type as any) || 'image',
        title: post.title,
        description: post.description,
        imageUrl: post.media_url || '',
        aspectRatio: 'square' as const,
        audioUrl: post.audio_url,
        videoUrl: post.video_url,
        creator: username || user?.email?.split('@')[0] || 'Anonymous',
        date: post.created_at,
        views: post.views,
        subgroupName: post.subgroup_name,
        subgroupSlug: post.subgroup_slug,
      })
      
      // Show modal
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to open post detail:', error)
    }
  }, [trackView, setSelectedCard, setShowDetailModal, username, user?.email, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white text-black font-['Space_Mono'] flex items-center justify-center">
        <div className="max-w-md w-full mx-4 border border-black p-8 bg-white">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
              👤
            </div>
            <h2 className="text-2xl font-bold mb-2">Sign up to view profiles</h2>
            <p className="text-gray-600 text-sm">
              Join Decro to discover creators, view their work, and connect with the community.
            </p>
          </div>
          <div className="space-y-3">
            <a 
              href="/signup" 
              className="block w-full text-center px-4 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              Create Account
            </a>
            <a 
              href="/" 
              className="block w-full text-center px-4 py-3 border border-black text-black hover:bg-gray-50 transition-colors"
            >
              Sign In
            </a>
          </div>
          <p className="text-xs text-gray-500 text-center mt-4">
            Already have an account? <a href="/" className="text-black hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black font-['Space_Mono']">
      <main className="max-w-5xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-gray-600">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  
                  {/* User Info */}
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {user?.name || user?.email}
                    </h1>
                    <p className="text-gray-600 text-sm">@{user?.email?.split('@')[0]}</p>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="mt-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                >
                  Edit Profile
                </button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="flex items-center gap-8 text-sm">
                  <div>
                    <span className="font-bold">{stats.post_count}</span>
                    <span className="text-gray-600 ml-1">posts</span>
                  </div>
                  <button className="hover:underline">
                    <span className="font-bold">{stats.follower_count}</span>
                    <span className="text-gray-600 ml-1">followers</span>
                  </button>
                  <button className="hover:underline">
                    <span className="font-bold">{stats.following_count}</span>
                    <span className="text-gray-600 ml-1">following</span>
                  </button>
                  <div>
                    <span className="font-bold">{stats.total_likes.toLocaleString()}</span>
                    <span className="text-gray-600 ml-1">total likes</span>
                  </div>
                  <div>
                    <span className="font-bold">{stats.total_views.toLocaleString()}</span>
                    <span className="text-gray-600 ml-1">total views</span>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-300 mb-6">
              <div className="flex gap-8">
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    activeTab === 'posts'
                      ? 'border-black font-bold text-black'
                      : 'border-transparent text-gray-500 hover:text-black'
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('liked')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    activeTab === 'liked'
                      ? 'border-black font-bold text-black'
                      : 'border-transparent text-gray-500 hover:text-black'
                  }`}
                >
                  Liked
                </button>
                <button
                  onClick={() => setActiveTab('spotlights')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    activeTab === 'spotlights'
                      ? 'border-black font-bold text-black'
                      : 'border-transparent text-gray-500 hover:text-black'
                  }`}
                >
                  Spotlights
                </button>
              </div>
            </div>

            {/* Sort Controls - only show for posts and liked tabs */}
            {activeTab !== 'spotlights' && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-['Space_Mono'] text-gray-600">Sort by:</span>
                  <div className="flex space-x-2">
                    {[
                      { id: 'newest', label: 'Newest' },
                      { id: 'oldest', label: 'Oldest' },
                      { id: 'most_liked', label: 'Most Liked' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleSort(option.id as 'newest' | 'oldest' | 'most_liked')}
                        className={`px-3 py-1 text-xs font-['Space_Mono'] border border-black transition-colors ${
                          sortMode === option.id
                            ? 'bg-black text-white'
                            : 'bg-white text-black hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Spotlights Tab Content */}
            {activeTab === 'spotlights' ? (
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
                  <div className="text-center py-12 border border-dashed border-gray-300">
                    <p className="text-gray-600">
                      {activeTab === 'posts' ? 'No posts yet' : 'No liked posts yet'}
                    </p>
                    {activeTab === 'posts' && (
                      <button
                        onClick={() => router.push('/create')}
                        className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800"
                      >
                        Create Your First Post
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
                      className="relative block w-full aspect-square overflow-hidden border border-gray-200 hover:border-black transition-colors"
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

