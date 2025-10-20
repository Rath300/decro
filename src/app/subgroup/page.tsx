"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import supabase from '@/lib/supabase-client'
// header/menu are global in layout
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/auth-modal'
import { motion, AnimatePresence } from 'framer-motion'

type Subgroup = { 
  id: string
  name: string
  slug: string
  description?: string | null
  cover_url?: string | null
  cover_image_url?: string | null
  member_count?: number
  post_count?: number
  created_at: string
  creator_username?: string
}

export default function SubgroupIndex() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Subgroup[]>([])
  const [filtered, setFiltered] = useState<Subgroup[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'posts' | 'recent'>('members')
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authAction, setAuthAction] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('subgroups')
          .select(`
            id,
            name,
            slug,
            description,
            cover_url,
            cover_image_url,
            member_count,
            post_count,
            created_at,
            created_by
          `)
          .order('member_count', { ascending: false })

        if (queryError) {
          console.error('Failed to load subgroups query:', queryError)
          throw queryError
        }
        
        console.log('Loaded subgroups data:', data)
        
        // Transform data to include creator username by fetching separately
        const transformedData = await Promise.all((data || []).map(async (item) => {
          let creator_username = null;
          if (item.created_by) {
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('username')
                .eq('external_id', item.created_by)
                .single();
              creator_username = profileData?.username || null;
            } catch (e) {
              // Ignore error, keep username as null
            }
          }
          return {
            ...item,
            creator_username
          };
        }))
        
        setItems(transformedData)
        setFiltered(transformedData)
      } catch (error) {
        console.error('Failed to load subgroups:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    let filteredItems = [...items]
    
    // Filter by search query
    const searchQuery = q.trim().toLowerCase()
    if (searchQuery) {
      filteredItems = filteredItems.filter(s => 
        s.name.toLowerCase().includes(searchQuery) || 
        s.slug.toLowerCase().includes(searchQuery) ||
        (s.description && s.description.toLowerCase().includes(searchQuery))
      )
    }
    
    // Sort based on selected option
    switch (sortBy) {
      case 'members':
        filteredItems.sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
        break
      case 'posts':
        filteredItems.sort((a, b) => (b.post_count || 0) - (a.post_count || 0))
        break
      case 'recent':
        filteredItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      default: // name
        filteredItems.sort((a, b) => a.name.localeCompare(b.name))
        break
    }
    
    setFiltered(filteredItems)
  }, [q, items, sortBy])

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 86400) return 'Today'
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-gray-500">Loading subgroups...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black mb-2">Discover Communities</h1>
            <p className="text-gray-600">Find and join subgroups to connect with like-minded people</p>
          </div>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                setAuthAction('create a community')
                setShowAuthModal(true)
              } else {
                router.push('/subgroup/create')
              }
            }}
            className="px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
          >
            Create Community
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search communities by name, description, or topic..."
              className="w-full p-4 border border-gray-300 rounded-lg text-black focus:border-black focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:border-black focus:outline-none"
            >
              <option value="members">Most Members</option>
              <option value="posts">Most Active</option>
              <option value="recent">Recently Created</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            {filtered.length} {filtered.length === 1 ? 'community' : 'communities'} found
            {q && ` for "${q}"`}
          </p>
        </div>

        {/* Subgroups Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-medium mb-2">No communities found</h3>
              <p className="text-sm">
                {q ? 'Try a different search term' : 'Be the first to create a community!'}
              </p>
            </div>
            {!q && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthAction('create a community')
                    setShowAuthModal(true)
                  } else {
                    router.push('/subgroup/create')
                  }
                }}
                className="px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors text-sm"
              >
                Create First Community
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filtered.map((s, index) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    y: -4,
                    transition: { duration: 0.2 }
                  }}
                >
                  <Link href={`/subgroup/${s.slug}`} className="block">
                    <div className="border border-gray-200 rounded-lg bg-white hover:shadow-lg transition-all duration-200 overflow-hidden h-full">
                      {/* Cover Image */}
                      <div className="h-32 bg-gray-100 relative">
                        {(s.cover_image_url || s.cover_url) ? (
                          <img
                            src={s.cover_image_url ?? s.cover_url ?? ''}
                            alt={s.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                            <span className="text-gray-400 text-lg font-medium">r/{s.slug}</span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-black mb-1 truncate">{s.name}</h3>
                            <p className="text-sm text-gray-500">r/{s.slug}</p>
                          </div>
                        </div>

                        {s.description && (
                          <p className="text-sm text-gray-700 mb-4 line-clamp-2">{s.description}</p>
                        )}

                        {/* Creator and Stats */}
                        {s.creator_username && (
                          <div className="text-xs text-gray-500 mb-2">
                            Created by u/{s.creator_username}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-4">
                            <span>{s.member_count || 0} members</span>
                            <span>{s.post_count || 0} posts</span>
                          </div>
                          <span>{getTimeAgo(s.created_at)}</span>
                        </div>
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


