/**
 * Tag Filter Page
 * Shows all posts with a specific tag
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePosts } from '@/context/post-context'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'
import DetailModal from '@/components/detail-modal'

interface TaggedPost {
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
  tags: string[]
}

export default function TagPage() {
  const params = useParams()
  const router = useRouter()
  const tag = decodeURIComponent(params.tag as string)
  const { setSelectedCard, setShowDetailModal, trackView, likedCards, toggleLike } = usePosts()
  const [posts, setPosts] = useState<TaggedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'most_liked'>('newest')
  const [tagInfo, setTagInfo] = useState<{ usage_count: number } | null>(null)

  const loadTagPosts = useCallback(async () => {
    setLoading(true)
    try {
      // Get tag info
      const { data: tagData, error: tagError } = await supabase
        .from('tags')
        .select('usage_count')
        .eq('name', tag)
        .maybeSingle()
      
      if (!tagError && tagData) {
        setTagInfo(tagData)
      } else {
        console.warn('Tag info not found:', tag)
      }

      // Get posts with this tag
      const { data, error } = await supabase.rpc('search_posts_by_tags', {
        tag_names: [tag],
        page_size: 50,
        page_offset: 0
      })

      if (error) {
        console.error('RPC search_posts_by_tags error:', error)
        throw error
      }

      if (data && data.length > 0) {
        // Get like and comment counts for each post
        const postsWithStats = await Promise.all(
          data.map(async (post: any) => {
            try {
              const [likesResult, commentsResult, tagsResult] = await Promise.all([
                supabase.rpc('get_like_count', { post_id_param: post.id }),
                supabase.rpc('get_comment_count', { post_id_param: post.id }),
                supabase
                  .from('post_tags')
                  .select('tags(name)')
                  .eq('post_id', post.id)
              ])

              return {
                ...post,
                like_count: likesResult.data || 0,
                comment_count: commentsResult.data || 0,
                tags: tagsResult.data?.map((t: any) => t.tags?.name).filter((n: any) => n) || []
              }
            } catch (statsError) {
              console.warn('Failed to load stats for post:', post.id, statsError)
              return {
                ...post,
                like_count: 0,
                comment_count: 0,
                tags: []
              }
            }
          })
        )

        setPosts(postsWithStats)
      } else {
        setPosts([])
      }
    } catch (error: any) {
      console.error('Failed to load tag posts:', error)
      alert('Failed to load posts: ' + (error.message || 'Please try again'))
    } finally {
      setLoading(false)
    }
  }, [tag])

  useEffect(() => {
    loadTagPosts()
  }, [loadTagPosts])

  const handleSort = (mode: 'newest' | 'oldest' | 'most_liked') => {
    setSortMode(mode)
    const sorted = [...posts]
    switch (mode) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'most_liked':
        sorted.sort((a, b) => b.like_count - a.like_count)
        break
    }
    setPosts(sorted)
  }

  const handlePostClick = useCallback(async (post: TaggedPost) => {
    try {
      await trackView(post.id)
      
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
        tags: post.tags
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
          <div className="flex items-center gap-2 mb-2">
            <Link href="/feed" className="text-gray-500 hover:text-black">Feed</Link>
            <span className="text-gray-500">/</span>
            <span className="text-black">#{tag}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">#{tag}</h1>
          {tagInfo && (
            <p className="text-gray-600 text-sm">
              {tagInfo.usage_count} {tagInfo.usage_count === 1 ? 'post' : 'posts'} with this tag
            </p>
          )}
        </div>

        {/* Sort Controls */}
        <div className="mb-6">
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
                  onClick={() => handleSort(option.id as any)}
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

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300">
            <p className="text-gray-600">No posts found with this tag</p>
            <Link href="/feed" className="mt-4 inline-block px-4 py-2 bg-black text-white hover:bg-gray-800">
              Back to Feed
            </Link>
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

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {post.tags.map((postTag) => (
                          <Link
                            key={postTag}
                            href={`/tags/${encodeURIComponent(postTag)}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-1.5 py-0.5 text-[10px] font-['Space_Mono'] rounded transition-colors ${
                              postTag === tag
                                ? 'bg-black text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            #{postTag}
                          </Link>
                        ))}
                      </div>
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
      </main>

      <DetailModal refetchPosts={loadTagPosts} />
    </div>
  )
}

