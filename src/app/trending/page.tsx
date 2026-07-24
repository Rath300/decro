/**
 * Trending Page
 *
 * sitemap.xml has always listed /trending and the database has always had a
 * get_trending_posts RPC, but the page itself did not exist, so the URL 404ed.
 *
 * Ranking is done in Postgres: views + 5x likes + 3x comments within a time
 * window, newest first as the tiebreak. The RPC returns counts and tags in the
 * same row, so unlike the tag page this needs no per-post follow-up queries.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePosts } from '@/context/post-context'
import supabase from '@/lib/supabase-client'
import { PostStats } from '@/components/post-stats'
import DetailModal from '@/components/detail-modal'

interface TrendingPost {
  id: string
  title: string | null
  description: string | null
  content_type: string
  media_url: string | null
  audio_url: string | null
  video_url: string | null
  creator_username: string | null
  created_at: string
  views: number
  like_count: number
  comment_count: number
  subgroup_id: string | null
  subgroup_name?: string
  subgroup_slug?: string
  tags: string[]
}

const WINDOWS = [
  { id: 24, label: 'Today' },
  { id: 168, label: 'This week' },
  { id: 720, label: 'This month' },
  { id: 87600, label: 'All time' },
] as const

export default function TrendingPage() {
  const router = useRouter()
  const { setSelectedCard, setShowDetailModal, trackView, likedCards, toggleLike } = usePosts()
  const [posts, setPosts] = useState<TrendingPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [windowHours, setWindowHours] = useState<number>(168)

  const loadTrending = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase.rpc('get_trending_posts', {
        page_size: 60,
        page_offset: 0,
        time_window_hours: windowHours,
      })

      if (rpcError) throw rpcError

      const rows = (data || []) as any[]

      // One batched lookup for subgroup labels instead of a query per post.
      const subgroupIds = Array.from(
        new Set(rows.map((r) => r.subgroup_id).filter(Boolean))
      )

      let subgroups: Record<string, { name: string; slug: string }> = {}
      if (subgroupIds.length > 0) {
        const { data: subgroupRows } = await supabase
          .from('subgroups')
          .select('id,name,slug')
          .in('id', subgroupIds)

        subgroups = Object.fromEntries(
          (subgroupRows || []).map((s: any) => [s.id, { name: s.name, slug: s.slug }])
        )
      }

      setPosts(
        rows.map((row) => ({
          ...row,
          views: Number(row.views ?? 0),
          like_count: Number(row.like_count ?? 0),
          comment_count: Number(row.comment_count ?? 0),
          tags: row.tags ?? [],
          subgroup_name: row.subgroup_id ? subgroups[row.subgroup_id]?.name : undefined,
          subgroup_slug: row.subgroup_id ? subgroups[row.subgroup_id]?.slug : undefined,
        }))
      )
    } catch (err: any) {
      console.error('Failed to load trending posts:', err)
      setError(err?.message || 'Could not load trending posts')
    } finally {
      setLoading(false)
    }
  }, [windowHours])

  useEffect(() => {
    loadTrending()
  }, [loadTrending])

  const handlePostClick = useCallback(
    async (post: TrendingPost) => {
      try {
        await trackView(post.id)

        if (post.content_type === 'text') {
          router.push(`/post/${post.id}`)
          return
        }

        setSelectedCard({
          id: post.id,
          type: (post.content_type as any) || 'image',
          title: post.title || '',
          description: post.description || undefined,
          imageUrl: post.media_url || '',
          aspectRatio: 'square' as const,
          audioUrl: post.audio_url || undefined,
          videoUrl: post.video_url || undefined,
          creator: post.creator_username || 'Anonymous',
          date: post.created_at,
          views: post.views,
          subgroupName: post.subgroup_name,
          subgroupSlug: post.subgroup_slug,
          tags: post.tags,
        })

        setShowDetailModal(true)
      } catch (err) {
        console.error('Failed to open post detail:', err)
      }
    },
    [trackView, setSelectedCard, setShowDetailModal, router]
  )

  return (
    <div className="min-h-screen bg-white text-black font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/feed" className="text-gray-500 hover:text-black">Feed</Link>
            <span className="text-gray-500">/</span>
            <span className="text-black">Trending</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Trending</h1>
          <p className="text-gray-600 text-sm">
            Ranked by views, likes and comments. Not by who paid.
          </p>
        </div>

        <div className="mb-6 flex items-center space-x-4">
          <span className="text-sm text-gray-600">Window:</span>
          <div className="flex flex-wrap gap-2">
            {WINDOWS.map((option) => (
              <button
                key={option.id}
                onClick={() => setWindowHours(option.id)}
                className={`px-3 py-1 text-xs border border-black transition-colors ${
                  windowHours === option.id
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Loading trending posts...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 border border-dashed border-red-300">
            <p className="text-red-700">{error}</p>
            <button
              onClick={loadTrending}
              className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-300">
            <p className="text-gray-600">Nothing has trended in this window yet</p>
            <Link
              href="/feed"
              className="mt-4 inline-block px-4 py-2 bg-black text-white hover:bg-gray-800"
            >
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
                  transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.04, ease: 'easeOut' }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  className="group break-inside-avoid mb-4"
                >
                  <button
                    onClick={() => handlePostClick(post)}
                    className="relative block w-full aspect-square overflow-hidden border border-gray-200 hover:border-black transition-colors"
                  >
                    <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 text-[10px] bg-black text-white">
                      #{index + 1}
                    </span>

                    {post.media_url && post.content_type !== 'text' ? (
                      <img
                        src={post.media_url}
                        alt={post.title || 'Post'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-white border border-gray-200 flex items-center justify-center p-4">
                        <div className="text-center">
                          <h4 className="text-sm md:text-base text-black line-clamp-2">
                            {post.title || 'Post'}
                          </h4>
                          {post.description && (
                            <p className="mt-2 text-xs md:text-sm text-gray-600 line-clamp-3">
                              {post.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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

                  <div className="mt-2">
                    {post.title && (
                      <button
                        className="text-left w-full text-sm text-black hover:underline line-clamp-2"
                        onClick={() => handlePostClick(post)}
                      >
                        {post.title}
                      </button>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {post.tags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/tags/${encodeURIComponent(tag)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition-colors"
                          >
                            #{tag}
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
                            className="text-blue-600 hover:text-blue-800 transition-colors line-clamp-1"
                          >
                            {post.creator_username}
                          </Link>
                        )}
                        {post.subgroup_name && post.subgroup_slug && (
                          <Link
                            href={`/subgroup/${post.subgroup_slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-500 text-[10px] hover:text-blue-600 transition-colors"
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
                        aria-label={likedCards.has(post.id) ? 'Unlike' : 'Like'}
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
                          fill={likedCards.has(post.id) ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
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

      <DetailModal refetchPosts={loadTrending} />
    </div>
  )
}
