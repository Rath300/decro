'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth-modal'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
// header/menu are now global from layout
import supabase from '@/lib/supabase-client'

type Spotlight = { 
  id: string
  title: string
  description?: string | null
  cover_image_url?: string | null
  is_featured: boolean
  created_at: string
  post_ids: string[]
  post_images: string[]
  creator_username?: string
  item_count: number
}

export default function SpotlightPage() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const [filteredSpotlights, setFilteredSpotlights] = useState<Spotlight[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchAuthor, setSearchAuthor] = useState('')
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    const loadSpotlights = async () => {
      try {
        // Fetch spotlight collections with their items and creator info
        const { data: collections, error } = await supabase
          .from('spotlight_collections')
          .select(`
            id,
            title,
            description,
            cover_image_url,
            is_featured,
            created_at,
            created_by,
            creator_id,
            profiles:creator_id (
              username
            ),
            spotlight_items(
              post_id,
              posts(media_url)
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Transform data
        const transformed = collections?.map((col: any) => ({
          id: col.id,
          title: col.title,
          description: col.description,
          cover_image_url: col.cover_image_url,
          is_featured: col.is_featured,
          created_at: col.created_at,
          post_ids: col.spotlight_items?.map((item: any) => item.post_id) || [],
          post_images: col.spotlight_items?.map((item: any) => item.posts?.media_url).filter(Boolean) || [],
          creator_username: col.profiles?.username || 'Unknown',
          item_count: col.spotlight_items?.length || 0
        })) || []

        setSpotlights(transformed)
      } catch (error) {
        console.error('Failed to load spotlights:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSpotlights()
  }, [])

  // Filter spotlights based on search queries
  useEffect(() => {
    let filtered = [...spotlights]

    // Filter by title/description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(sp => 
        sp.title.toLowerCase().includes(query) ||
        (sp.description && sp.description.toLowerCase().includes(query))
      )
    }

    // Filter by author
    if (searchAuthor.trim()) {
      const authorQuery = searchAuthor.toLowerCase().trim()
      filtered = filtered.filter(sp => 
        sp.creator_username?.toLowerCase().includes(authorQuery)
      )
    }

    setFilteredSpotlights(filtered)
  }, [spotlights, searchQuery, searchAuthor])

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Spotlight</h1>
          <Link href="/spotlight/create" className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white font-['Space_Mono'] text-sm">Create spotlight</Link>
        </div>

        {/* Search Section */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search spotlights by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-['Space_Mono'] text-sm focus:outline-none focus:border-black text-black bg-white"
            />
            <input
              type="text"
              placeholder="Search by author username..."
              value={searchAuthor}
              onChange={(e) => setSearchAuthor(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-['Space_Mono'] text-sm focus:outline-none focus:border-black text-black bg-white"
            />
          </div>
          {(searchQuery || searchAuthor) && (
            <div className="text-sm text-gray-600">
              Found {filteredSpotlights.length} spotlight{filteredSpotlights.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
              {searchQuery && searchAuthor && ' and'}
              {searchAuthor && ` by author "${searchAuthor}"`}
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
            <p className="mt-4 text-gray-600">Loading spotlights...</p>
          </div>
        ) : spotlights.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black">No spotlights yet.</p>
          </div>
        ) : filteredSpotlights.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black">No spotlights found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredSpotlights.map((sp, index) => (
                <motion.div
                  key={sp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="border border-black bg-white cursor-pointer group"
                >
                  <Link href={`/spotlight/${sp.id}`} className="block">
                    {/* Album Cover */}
                    <div className="relative aspect-square overflow-hidden">
                      {sp.cover_image_url ? (
                        <img 
                          src={sp.cover_image_url} 
                          alt={sp.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : sp.post_images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 w-full h-full">
                          {sp.post_images.slice(0, 4).map((url, idx) => (
                            <img 
                              key={idx} 
                              src={url} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <div className="text-center">
                            <div className="text-2xl mb-2">📁</div>
                            <div className="text-sm">No Images</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-0 h-0 border-l-[8px] border-l-black border-y-[6px] border-y-transparent ml-1"></div>
                        </div>
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="p-4">
                      <h2 className="text-lg font-bold text-black mb-1 line-clamp-1">{sp.title}</h2>
                      <p className="text-sm text-gray-600 mb-2">by {sp.creator_username}</p>
                      {sp.description && (
                        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{sp.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{sp.item_count} {sp.item_count === 1 ? 'post' : 'posts'}</span>
                        <span>{new Date(sp.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} />
    </div>
  )
}