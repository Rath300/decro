'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PostStats } from '@/components/post-stats'

interface SpotlightItem {
  id: string
  post_id: string
  order_index: number
  posts: {
    id: string
    title: string
    description?: string
    media_url?: string
    content_type: string
    creator_id: string
    views: number
    created_at: string
    profiles?: {
      username: string
    }
  }
}

interface SpotlightData {
  id: string
  title: string
  description?: string
  cover_image_url?: string
  created_by: string
  created_at: string
  profiles?: {
    username: string
  }
}

export default function SpotlightDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const spotlightId = params.id as string

  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null)
  const [items, setItems] = useState<SpotlightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    loadSpotlight()
  }, [spotlightId])

  const loadSpotlight = async () => {
    try {
      console.log('Loading spotlight with ID:', spotlightId)
      
      // Load spotlight collection with creator info - use creator_id for the foreign key
      const { data: spotlightData, error: spotlightError } = await supabase
        .from('spotlight_collections')
        .select(`
          id,
          title,
          description,
          cover_image_url,
          created_by,
          creator_id,
          created_at,
          profiles!spotlight_collections_creator_id_fkey (
            username
          )
        `)
        .eq('id', spotlightId)
        .single()

      if (spotlightError) {
        console.error('Failed to load spotlight collection:', spotlightError)
        throw spotlightError
      }
      
      console.log('Loaded spotlight collection:', spotlightData)

      // Transform the data to match our interface
      const transformedSpotlight: SpotlightData | null = spotlightData ? {
        ...spotlightData,
        profiles: Array.isArray((spotlightData as any).profiles) && (spotlightData as any).profiles.length > 0 
          ? (spotlightData as any).profiles[0] 
          : (spotlightData as any).profiles
      } : null

      setSpotlight(transformedSpotlight)

      // Load spotlight items with post details - simplified query first to test
      let itemsData: SpotlightItem[], itemsError: any
      
      // First try a simple query to see if we get any items at all
      const { data: simpleItems, error: simpleError } = await supabase
        .from('spotlight_items')
        .select('id, post_id, order_index')
        .eq('collection_id', spotlightId)
        .order('order_index', { ascending: true })
        
      console.log('Simple spotlight items query result:', { simpleItems, simpleError })
      
      if (simpleError) {
        console.error('Simple query failed:', simpleError)
        throw simpleError
      }
      
      if (simpleItems && simpleItems.length > 0) {
        // If we have items, now get the detailed post info
        // Try a simpler approach first - get posts separately to avoid foreign key issues
        const postIds = simpleItems.map(item => item.post_id)
        
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            description,
            media_url,
            content_type,
            creator_id,
            views,
            created_at,
            profiles!posts_creator_id_fkey (
              username
            )
          `)
          .in('id', postIds)
          
        if (postsError) {
          console.error('Failed to load posts for spotlight:', postsError)
          itemsData = []
          itemsError = postsError
        } else {
          // Merge the spotlight items with post data
          const mergedItems = simpleItems.map(item => {
            const post = postsData?.find(p => p.id === item.post_id)
            
            const spotlightItem: SpotlightItem = {
              id: item.id,
              post_id: item.post_id,
              order_index: item.order_index,
              posts: post ? {
                id: post.id,
                title: post.title,
                description: post.description,
                media_url: post.media_url || undefined,
                content_type: post.content_type,
                creator_id: post.creator_id,
                views: post.views,
                created_at: post.created_at,
                profiles: Array.isArray(post.profiles) && post.profiles.length > 0 
                  ? { username: (post.profiles[0] as any).username }
                  : (post.profiles && !Array.isArray(post.profiles)) 
                    ? { username: (post.profiles as any).username }
                    : undefined
              } : {
                id: item.post_id,
                title: 'Unknown',
                content_type: 'image',
                creator_id: '',
                views: 0,
                created_at: new Date().toISOString()
              }
            }
            
            return spotlightItem
          })
          
          // Sort by order_index
          mergedItems.sort((a, b) => a.order_index - b.order_index)
          
          itemsData = mergedItems
          itemsError = null
        }
      } else {
        // No items found
        itemsData = []
        itemsError = null
      }

      if (itemsError) {
        console.error('Failed to load spotlight items:', itemsError)
        throw itemsError
      }

      console.log('Loaded spotlight items:', itemsData)
      
      // Transform items data to handle nested profiles structure
      const transformedItems: SpotlightItem[] = (itemsData || []).map((item: any) => ({
        ...item,
        posts: item.posts ? {
          ...item.posts,
          profiles: Array.isArray(item.posts.profiles) && item.posts.profiles.length > 0
            ? item.posts.profiles[0]
            : item.posts.profiles
        } : item.posts
      }))
      
      setItems(transformedItems)
      console.log('Set items:', transformedItems)
    } catch (error) {
      console.error('Failed to load spotlight:', error)
      // Set empty items on error to prevent crashing
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const nextItem = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-gray-500">Loading spotlight...</div>
      </div>
    )
  }

  if (!spotlight) {
    return (
      <div className="min-h-screen bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Spotlight not found</div>
          <Link href="/spotlight" className="text-black hover:underline">
            ← Back to Spotlights
          </Link>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="max-w-4xl mx-auto">
          <nav className="mb-4">
            <Link href="/spotlight" className="text-sm text-gray-500 hover:text-black">
              ← Back to Spotlights
            </Link>
          </nav>

          <div className="flex items-start gap-6">
            {/* Cover Image */}
            <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {spotlight.cover_image_url ? (
                <img
                  src={spotlight.cover_image_url}
                  alt={spotlight.title}
                  className="w-full h-full object-cover"
                />
              ) : items.length > 0 && currentItem?.posts?.media_url ? (
                <img
                  src={currentItem.posts.media_url}
                  alt={spotlight.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-black mb-2">{spotlight.title}</h1>
              {spotlight.description && (
                <p className="text-gray-600 mb-4">{spotlight.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span>Created by {spotlight.profiles?.username || 'Unknown'}</span>
                <span>•</span>
                <span>{getTimeAgo(spotlight.created_at)}</span>
                <span>•</span>
                <span>{items.length} {items.length === 1 ? 'post' : 'posts'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {items.length > 0 ? (
        <div className="max-w-4xl mx-auto p-6">
          {/* Current Item Display */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            {currentItem.posts.content_type === 'text' ? (
              <Link href={`/post/${currentItem.post_id}`} className="block p-8">
                <h2 className="text-2xl font-bold text-black mb-2">{currentItem.posts.title}</h2>
                {currentItem.posts.profiles?.username && (
                  <p className="text-sm text-blue-600 mb-4">by {currentItem.posts.profiles.username}</p>
                )}
                {currentItem.posts.description && (
                  <p className="text-gray-700 whitespace-pre-wrap">{currentItem.posts.description}</p>
                )}
                <div className="mt-4">
                  <PostStats postId={currentItem.post_id} initialViews={currentItem.posts.views} />
                </div>
              </Link>
            ) : (
              <div className="relative">
                <Link href={`/feed#${currentItem.post_id}`} className="block">
                  {currentItem.posts.media_url && (
                    <img
                      src={currentItem.posts.media_url}
                      alt={currentItem.posts.title}
                      className="w-full max-h-96 object-contain bg-gray-100"
                    />
                  )}
                </Link>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4">
                  <h2 className="text-xl font-bold mb-1">{currentItem.posts.title}</h2>
                  {currentItem.posts.profiles?.username && (
                    <p className="text-sm text-blue-300 mb-2">by {currentItem.posts.profiles.username}</p>
                  )}
                  {currentItem.posts.description && (
                    <p className="text-sm text-gray-200 line-clamp-2 mb-2">{currentItem.posts.description}</p>
                  )}
                  <div className="mt-2">
                    <PostStats postId={currentItem.post_id} initialViews={currentItem.posts.views} />
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prevItem}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-black text-white disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              ← Previous
            </button>

            <div className="text-sm text-gray-600">
              {currentIndex + 1} of {items.length}
            </div>

            <button
              onClick={nextItem}
              disabled={currentIndex === items.length - 1}
              className="px-4 py-2 bg-black text-white disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Thumbnail Grid */}
          {items.length > 1 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-black mb-4">All Posts</h3>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? 'border-black'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {item.posts.media_url ? (
                      <img
                        src={item.posts.media_url}
                        alt={item.posts.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs">
                        TEXT
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-6 text-center">
          <div className="text-gray-500">This spotlight collection is empty.</div>
        </div>
      )}
    </div>
  )
}
