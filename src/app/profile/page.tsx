/**
 * User Profile Page (Own Profile)
 * Shows user's posts, stats, and edit button
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'

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

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<UserPost[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'liked'>('posts')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    if (!user?.id) return

    loadProfile()
  }, [user?.id, isAuthenticated])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      // Load user stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
        user_id_param: user.id
      })

      if (!statsError && statsData) {
        setStats(statsData)
      }

      // Load user posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          media_url,
          content_type,
          views,
          created_at
        `)
        .eq('creator_id', user.id)
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

  if (!isAuthenticated) {
    return null
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
                      ? 'border-black font-bold'
                      : 'border-transparent text-gray-500 hover:text-black'
                  }`}
                >
                  Posts
                </button>
                <button
                  onClick={() => setActiveTab('liked')}
                  className={`pb-3 px-1 border-b-2 transition-colors ${
                    activeTab === 'liked'
                      ? 'border-black font-bold'
                      : 'border-transparent text-gray-500 hover:text-black'
                  }`}
                >
                  Liked
                </button>
              </div>
            </div>

            {/* Posts Grid */}
            {posts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-300">
                <p className="text-gray-600">No posts yet</p>
                <button
                  onClick={() => router.push('/create')}
                  className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800"
                >
                  Create Your First Post
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {posts.map((post) => (
                  <div key={post.id} className="group">
                    <a
                      href={`/feed#${post.id}`}
                      className="relative block aspect-square overflow-hidden border border-gray-200 hover:border-black transition-colors"
                      onClick={() => {
                        if (user?.id) {
                          // Fire-and-forget view tracking
                          supabase.rpc('track_view', { post_id_param: post.id, user_id_param: user.id }).catch(() => {})
                        }
                      }}
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
                    {/* Always-visible compact stats below the tile */}
                    <div className="mt-1">
                      <PostStats
                        postId={post.id}
                        initialViews={post.views}
                        initialLikes={post.like_count}
                        initialComments={post.comment_count}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

