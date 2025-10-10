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
}

export default function SpotlightPage() {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    const loadSpotlights = async () => {
      try {
        // Fetch spotlight collections with their items
        const { data: collections, error } = await supabase
          .from('spotlight_collections')
          .select(`
            id,
            title,
            description,
            cover_image_url,
            is_featured,
            created_at,
            spotlight_items(
              post_id,
              posts(media_url)
            )
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Transform data
        const transformed = collections?.map(col => ({
          id: col.id,
          title: col.title,
          description: col.description,
          cover_image_url: col.cover_image_url,
          is_featured: col.is_featured,
          created_at: col.created_at,
          post_ids: col.spotlight_items?.map((item: any) => item.post_id) || [],
          post_images: col.spotlight_items?.map((item: any) => item.posts?.media_url).filter(Boolean) || []
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

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-black">Spotlight</h1>
          <Link href="/spotlight/create" className="px-3 py-1 border border-black text-black hover:bg-black hover:text-white font-['Space_Mono'] text-sm">Create spotlight</Link>
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {spotlights.map((sp, index) => (
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
                  className="border border-black p-3 bg-white"
                >
                  <h2 className="text-lg font-bold text-black mb-2">{sp.title}</h2>
                  {sp.description && <p className="text-sm text-gray-700 mb-3">{sp.description}</p>}
                  <div className="grid grid-cols-2 gap-2 aspect-square">
                    {sp.cover_image_url ? (
                      <img src={sp.cover_image_url} alt={sp.title} className="col-span-2 row-span-2 w-full h-full object-cover" />
                    ) : (
                      sp.post_images.slice(0, 4).map((url, idx) => (
                        <img key={idx} src={url} alt="" className="w-full h-full object-cover" />
                      ))
                    )}
                  </div>
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