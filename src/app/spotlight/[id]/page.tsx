'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { PostStats } from '@/components/post-stats'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import DetailModal from '@/components/detail-modal'

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
  const { setSelectedCard, setShowDetailModal, playingAudio, setPlayingAudio } = usePosts()
  const spotlightId = params.id as string

  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null)
  const [items, setItems] = useState<SpotlightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('slideshow')
  
  // Audio refs for music playback
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  
  // Track click timing for double-click detection
  const clickTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const clickCounts = useRef<{ [key: string]: number }>({})

  useEffect(() => {
    loadSpotlight()
  }, [spotlightId])

  const loadSpotlight = async () => {
    try {
      console.log('Loading spotlight with ID:', spotlightId)
      console.log('Starting to load spotlight collection...')
      
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

      console.log('Transformed spotlight:', transformedSpotlight)
      setSpotlight(transformedSpotlight)
      console.log('Set spotlight state')

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
      console.log('Number of items loaded:', itemsData?.length || 0)
      
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
      console.log('Spotlight loading completed successfully')
    } catch (error) {
      console.error('Failed to load spotlight:', error)
      // Set empty items on error to prevent crashing
      setItems([])
    } finally {
      console.log('Setting loading to false')
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

  // Convert spotlight item to MediaCard format for DetailModal
  const convertToMediaCard = (item: SpotlightItem): MediaCard => {
    const post = item.posts
    return {
      id: post.id,
      type: post.content_type as any,
      title: post.title,
      description: post.description || '',
      imageUrl: post.media_url || '',
      aspectRatio: 'square', // Default, could be enhanced with actual aspect ratio detection
      audioUrl: post.content_type === 'music' ? post.media_url : undefined,
      videoUrl: ['video', 'film'].includes(post.content_type) ? post.media_url : undefined,
      creator: post.profiles?.username || 'Unknown',
      date: post.created_at,
      views: post.views,
      tags: []
    }
  }

  // Handle post click - show DetailModal
  const handlePostClick = (item: SpotlightItem) => {
    const mediaCard = convertToMediaCard(item)
    setSelectedCard(mediaCard)
    setShowDetailModal(true)
  }

  // Handle audio playback for music posts
  const handleAudioPlay = (item: SpotlightItem) => {
    if (item.posts.content_type !== 'music' || !item.posts.media_url) return
    
    const postId = item.post_id
    
    // Stop other playing audio
    if (playingAudio && playingAudio !== postId) {
      const currentAudio = audioRefs.current[playingAudio]
      if (currentAudio) {
        currentAudio.pause()
        currentAudio.currentTime = 0
      }
    }
    
    // Create audio element if not exists
    if (!audioRefs.current[postId]) {
      audioRefs.current[postId] = new Audio(item.posts.media_url)
    }
    
    const audio = audioRefs.current[postId]
    
    if (playingAudio === postId) {
      // Pause if currently playing
      audio.pause()
      audio.currentTime = 0
      setPlayingAudio(null)
    } else {
      // Play if not playing
      audio.play()
      setPlayingAudio(postId)
      audio.onended = () => setPlayingAudio(null)
    }
  }
  
  // Handle single/double click for music posts in grid view
  const handleMusicClick = (item: SpotlightItem, event: React.MouseEvent) => {
    event.preventDefault()
    const postId = item.post_id
    
    // Initialize click count for this post if not exists
    if (!clickCounts.current[postId]) {
      clickCounts.current[postId] = 0
    }
    
    // Increment click count
    clickCounts.current[postId]++
    
    // Clear any existing timer for this post
    if (clickTimers.current[postId]) {
      clearTimeout(clickTimers.current[postId])
    }
    
    // Set a new timer to detect double-click
    clickTimers.current[postId] = setTimeout(() => {
      if (clickCounts.current[postId] === 1) {
        // Single click: Play/pause audio
        handleAudioPlay(item)
      } else if (clickCounts.current[postId] >= 2) {
        // Double click: Open detail modal
        handlePostClick(item)
      }
      
      // Reset click count
      clickCounts.current[postId] = 0
    }, 300) // 300ms window for double-click detection
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
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('slideshow')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'slideshow'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Slideshow
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                Grid
              </button>
            </div>
          </div>

          {/* Slideshow View */}
          {viewMode === 'slideshow' && currentItem && (
            <>
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
                <div 
                  className="cursor-pointer"
                  onClick={() => currentItem.posts.content_type === 'music' ? handleAudioPlay(currentItem) : handlePostClick(currentItem)}
                >
                  {currentItem.posts.content_type === 'music' ? (
                    <div className="relative">
                      {currentItem.posts.media_url ? (
                        <div className="relative w-full h-80">
                          <img
                            src={currentItem.posts.media_url}
                            alt={currentItem.posts.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                            <div className="w-20 h-20 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                              {playingAudio === currentItem.post_id ? (
                                <div className="flex space-x-1">
                                  <div className="w-1 bg-white h-6 animate-pulse"></div>
                                  <div className="w-1 bg-white h-8 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-1 bg-white h-6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                              ) : (
                                <svg className="w-8 h-8 ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-80 bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="w-20 h-20 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                              {playingAudio === currentItem.post_id ? (
                                <div className="flex space-x-1">
                                  <div className="w-1 bg-white h-6 animate-pulse"></div>
                                  <div className="w-1 bg-white h-8 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-1 bg-white h-6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                              ) : (
                                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              )}
                            </div>
                            <h3 className="text-xl font-bold">{currentItem.posts.title}</h3>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : currentItem.posts.media_url ? (
                    <img
                      src={currentItem.posts.media_url}
                      alt={currentItem.posts.title}
                      className="w-full max-h-96 object-contain bg-gray-100"
                    />
                  ) : null}
                  
                  {/* Play overlay for non-music content */}
                  {currentItem.posts.content_type !== 'music' && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                
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
            </>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-black mb-2">All Posts ({items.length})</h3>
                <p className="text-gray-600">Click any post to view details</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={(e) => item.posts.content_type === 'music' ? handleMusicClick(item, e) : handlePostClick(item)}
                  >
                    {/* Media Display */}
                    {item.posts.content_type === 'music' ? (
                      <div className="relative aspect-square overflow-hidden" title="Single click to play/pause, double-click to view details">
                        {item.posts.media_url ? (
                          <>
                            <img
                              src={item.posts.media_url}
                              alt={item.posts.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                              <div className="w-16 h-16 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
                                {playingAudio === item.post_id ? (
                                  <div className="flex space-x-1">
                                    <div className="w-1 bg-white h-5 animate-pulse"></div>
                                    <div className="w-1 bg-white h-7 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1 bg-white h-5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                ) : (
                                  <svg className="w-6 h-6 ml-1 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="relative aspect-square bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <div className="text-center text-white">
                              <div className="w-16 h-16 mx-auto mb-3 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                {playingAudio === item.post_id ? (
                                  <div className="flex space-x-1">
                                    <div className="w-1 bg-white h-5 animate-pulse"></div>
                                    <div className="w-1 bg-white h-7 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-1 bg-white h-5 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                  </div>
                                ) : (
                                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : item.posts.content_type === 'text' ? (
                      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                        <div className="text-center">
                          <div className="text-3xl mb-2">📝</div>
                          <div className="text-xs text-gray-500">TEXT POST</div>
                        </div>
                      </div>
                    ) : item.posts.media_url ? (
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={item.posts.media_url}
                          alt={item.posts.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {/* Play overlay for videos */}
                        {['video', 'film'].includes(item.posts.content_type) && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                            <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <div className="text-gray-400">No Media</div>
                      </div>
                    )}
                    
                    {/* Post Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-black text-sm mb-1 line-clamp-2">
                        {item.posts.title}
                      </h3>
                      {item.posts.profiles?.username && (
                        <p className="text-xs text-blue-600 mb-2">by {item.posts.profiles.username}</p>
                      )}
                      {item.posts.description && (
                        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{item.posts.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <PostStats postId={item.post_id} initialViews={item.posts.views} />
                        <span className="text-xs text-gray-400">{getTimeAgo(item.posts.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
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
      
      {/* Detail Modal */}
      <DetailModal />
    </div>
  )
}
