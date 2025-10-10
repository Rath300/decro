/**
 * Public Profile Page
 * View other users' profiles
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'
import { useToast } from '@/hooks/use-toast'

interface UserPost {
  id: string
  title: string
  media_url: string
  content_type: string
  views: number
  like_count: number
  comment_count: number
  created_at: string
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
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const username = params.username as string

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<UserPost[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [username])

  const loadProfile = async () => {
    try {
      // Get user by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url')
        .eq('username', username)
        .single()

      if (profileError) {
        toast.error('User not found')
        router.push('/feed')
        return
      }

      setProfile(profileData)

      // Check if current user is following
      if (currentUser?.id) {
        const { data: followData } = await supabase.rpc('is_following_user', {
          target_user_id: profileData.id
        })
        setIsFollowing(followData || false)
      }

      // Load stats
      const { data: statsData } = await supabase.rpc('get_user_stats', {
        user_id_param: profileData.id
      })
      if (statsData) setStats(statsData)

      // Load posts
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, media_url, content_type, views, created_at')
        .eq('creator_id', profileData.id)
        .order('created_at', { ascending: false })

      if (postsData) {
        const postsWithStats = await Promise.all(
          postsData.map(async (post) => {
            const [likesResult, commentsResult] = await Promise.all([
              supabase.rpc('get_like_count', { post_id_param: post.id }),
              supabase.rpc('get_comment_count', { post_id_param: post.id })
            ])
            return {
              ...post,
              like_count: likesResult.data || 0,
              comment_count: commentsResult.data || 0
            }
          })
        )
        setPosts(postsWithStats)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser?.id) {
      toast.error('Please sign in to follow users')
      return
    }

    if (!profile) return

    setFollowLoading(true)

    try {
      const { data, error } = await supabase.rpc('toggle_follow_user', {
        target_user_id: profile.id
      })

      if (error) throw error

      setIsFollowing(data.following)
      
      // Update follower count
      if (stats) {
        setStats({
          ...stats,
          follower_count: data.following ? stats.follower_count + 1 : stats.follower_count - 1
        })
      }

      toast.success(data.following ? 'Following!' : 'Unfollowed')
    } catch (error: any) {
      console.error('Follow toggle failed:', error)
      toast.error(error.message || 'Failed to follow user')
    } finally {
      setFollowLoading(false)
    }
  }

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

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="min-h-screen bg-white text-black font-['Space_Mono']">
      <main className="max-w-5xl mx-auto px-4 pb-12">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold text-gray-600">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  profile.username[0].toUpperCase()
                )}
              </div>
              
              {/* User Info */}
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {profile.full_name || profile.username}
                </h1>
                <p className="text-gray-600 text-sm mb-2">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm text-gray-800 max-w-md">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Action Button */}
            {isOwnProfile ? (
              <button
                onClick={() => router.push('/profile/edit')}
                className="mt-2 px-4 py-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-4 py-2 border-2 transition-colors ${
                  isFollowing
                    ? 'border-gray-300 hover:border-red-500 hover:text-red-500'
                    : 'border-black bg-black text-white hover:bg-gray-800'
                }`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-8 text-sm">
              <div>
                <span className="font-bold">{stats.post_count}</span>
                <span className="text-gray-600 ml-1">posts</span>
              </div>
              <div>
                <span className="font-bold">{stats.follower_count}</span>
                <span className="text-gray-600 ml-1">followers</span>
              </div>
              <div>
                <span className="font-bold">{stats.following_count}</span>
                <span className="text-gray-600 ml-1">following</span>
              </div>
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

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300">
            <p className="text-gray-600">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/feed#${post.id}`}
                className="group relative aspect-square overflow-hidden border border-gray-200 hover:border-black transition-colors"
              >
                {post.media_url && (
                  <img
                    src={post.media_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
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
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

