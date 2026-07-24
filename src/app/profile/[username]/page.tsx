/**
 * Public Profile Page
 * View other users' profiles
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/auth-context'
import { usePosts } from '@/context/post-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { PostStats } from '@/components/post-stats'
import { useToast } from '@/hooks/use-toast'
import DetailModal from '@/components/detail-modal'
import { CollaborationButton } from '@/components/collab/CollaborationButton'
import { MessageButton } from '@/components/messages/MessageButton'

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
  // Decode URL-encoded username and trim whitespace
  const username = decodeURIComponent(params.username as string).trim()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [displayedPosts, setDisplayedPosts] = useState<UserPost[]>([])

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
        router.push('/feed')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  // Check if viewing own profile - compare profile UUIDs properly
  const isOwnProfile = currentUserProfileId === profile.id

  return (
    <div className="min-h-screen bg-white text-black font-['Space_Mono']">
      <main className="max-w-5xl mx-auto px-2 sm:px-4 pb-8 sm:pb-12">
        {/* Profile Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
            <div className="flex items-start gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-600 flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-3xl font-bold mb-1 sm:mb-2 break-words">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-xs sm:text-sm text-gray-800 max-w-md break-words">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Action Button */}
            {isOwnProfile ? (
              <button
                onClick={() => router.push('/profile/edit')}
                className="w-full sm:w-auto px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors text-sm"
              >
                Edit Profile
              </button>
            ) : (
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
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6 sm:gap-8 text-sm flex-wrap">
              <div>
                <span className="font-bold">{stats.post_count || 0}</span>
                <span className="text-gray-600 ml-1">posts</span>
              </div>
              <div>
                <span className="font-bold">{stats.follower_count || 0}</span>
                <span className="text-gray-600 ml-1">followers</span>
              </div>
              <div>
                <span className="font-bold">{stats.following_count || 0}</span>
                <span className="text-gray-600 ml-1">following</span>
              </div>
              <div>
                <span className="font-bold">{(stats.total_likes || 0).toLocaleString()}</span>
                <span className="text-gray-600 ml-1">total likes</span>
              </div>
              <div>
                <span className="font-bold">{(stats.total_views || 0).toLocaleString()}</span>
                <span className="text-gray-600 ml-1">total views</span>
              </div>
            </div>
          )}
        </div>

        {/* Sort Controls - similar to feed page */}
        {posts.length > 0 && (
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
                    className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-['Space_Mono'] border border-black transition-colors ${
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

        {/* Posts Grid - use masonry layout like feed page */}
        {posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300">
            <p className="text-gray-600">No posts yet</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <AnimatePresence>
              {(displayedPosts.length > 0 ? displayedPosts : posts).map((post, index) => (
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
                  onClick={() => handlePostClick(post)}
                  className="relative block w-full aspect-square overflow-hidden border border-gray-200 hover:border-black transition-colors"
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
                {/* Subgroup info below the post */}
                {post.subgroup_name && post.subgroup_slug && (
                  <div className="mt-1 text-[10px] text-gray-500 font-['Space_Mono']">
                    in <Link href={`/subgroup/${post.subgroup_slug}`} className="hover:text-blue-600 transition-colors">{post.subgroup_name}</Link>
                  </div>
                )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
      <DetailModal refetchPosts={refreshPosts} />
    </div>
  )
}

