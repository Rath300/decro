/**
 * Trending Page
 * Shows trending posts based on engagement score
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePosts } from '@/context/post-context'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'
import DetailModal from '@/components/detail-modal'

interface TrendingPost {
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
  creator_username?: string
  subgroup_id?: string
  subgroup_name?: string
  subgroup_slug?: string
  trending_score?: number
}

export default function TrendingPage() {
  const router = useRouter()
  const { setSelectedCard, setShowDetailModal, trackView, likedCards, toggleLike } = usePosts()
  const { isAuthenticated, user } = useAuth()
  const [posts, setPosts] = useState<TrendingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('week')

  const loadTrendingPosts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_trending_posts', {
        time_range_days: timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365,
        limit_count: 50
      })

      if (error) throw error

      if (data) {
        // Get like and comment counts for each post
        const postsWithStats = await Promise.all(
          data.map(async (post: any) => {
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
      console.error('Failed to load trending posts:', error)
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    loadTrendingPosts()
  }, [loadTrendingPosts])

  const handlePostClick = useCallback(async (post: TrendingPost) => {
    try {
      await trackView(post.id)
      
      // For text posts, redirect to Reddit-style forum page
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
        creator: post.creator_username || 'Anonymous',
        date: post.created_at,
        views: post.views,
        subgroupName: post.subgroup_name,
        subgroupSlug: post.subgroup_slug,
        tags: [],
      })
      
      setShowDetailModal(true)
    } catch (error) {
      console.error('Failed to open post detail:', error)
    }
  }, [trackView, setSelectedCard, setShowDetailModal, router])

  return (
    <div className="min-h-screen bg-white text-black font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔥 Trending</h1>
          <p className="text-gray-600 text-sm">
            The most engaged posts based on likes, comments, and views
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-['Space_Mono'] text-gray-600">Time Range:</span>
            <div className="flex space-x-2">
              {[
                { id: 'day', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All Time' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTimeRange(option.id as any)}
                  className={`px-3 py-1 text-xs font-['Space_Mono'] border border-black transition-colors ${
                    timeRange === option.id
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

        {/* Trending Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Loading trending posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300">
            <p className="text-gray-600">No trending posts for this time range</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            <AnimatePresence>
              {posts.map((post, index) => (
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
                    {/* Trending Badge */}
                    <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white px-2 py-1 text-xs font-bold rounded">
                      #{index + 1}
                    </div>

                    {post.media_url && post.content_type !== 'text' ? (
                      <img
                        src={post.media_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
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

                  {/* Post info */}
                  <div className="mt-2">
                    {post.title && (
                      <button
                        className="text-left w-full text-sm font-['Space_Mono'] text-black hover:underline line-clamp-2"
                        onClick={() => handlePostClick(post)}
                      >
                        {post.title}
                      </button>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                      <div className="flex flex-col">
                        {post.creator_username && (
                          <Link
                            href={`/profile/${post.creator_username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors line-clamp-1"
                          >
                            {post.creator_username}
                          </Link>
                        )}
                        {post.subgroup_name && post.subgroup_slug && (
                          <Link 
                            href={`/subgroup/${post.subgroup_slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-['Space_Mono'] text-gray-500 text-[10px] hover:text-blue-600 transition-colors"
                          >
                            in {post.subgroup_name}
                          </Link>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLike(post.id)
                        }}
                        className={`p-1 rounded-full transition-all duration-200 ${
                          likedCards.has(post.id)
                            ? 'bg-red-50 text-red-500'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <svg 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill={likedCards.has(post.id) ? "currentColor" : "none"}
                          stroke="currentColor" 
                          strokeWidth="2"
                          className="transition-all duration-200"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div onClick={(e) => e.stopPropagation()} className="mt-1">
                      <PostStats 
                        postId={post.id}
                        initialViews={post.views}
                        initialLikes={post.like_count}
                        initialComments={post.comment_count}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8">
          <p className="text-sm font-['Space_Mono'] text-gray-500">
            Trending is calculated based on engagement (likes × 3 + comments × 2 + views) with time decay
          </p>
        </div>
      </main>

      <DetailModal refetchPosts={loadTrendingPosts} />
    </div>
  )
}

