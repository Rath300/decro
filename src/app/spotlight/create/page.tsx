'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/context/auth-context'
import { uploadImage } from '@/lib/upload'

interface PostRow {
  id: string
  title: string
  media_url: string | null
  created_at: string
  description?: string | null
}

export default function SpotlightCreatePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [filteredPosts, setFilteredPosts] = useState<PostRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }
  }, [isAuthenticated])

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, media_url, created_at, description')
          .order('created_at', { ascending: false })
          .limit(500)
        if (error) throw error
        const postsData = data || []
        setPosts(postsData)
        setFilteredPosts(postsData)
      } catch (e) {
        console.error('Failed to load posts for spotlight:', e)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [])

  // Filter posts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts)
    } else {
      const filtered = posts.filter(post => 
        post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredPosts(filtered)
    }
  }, [searchQuery, posts])

  const togglePost = (postId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }
    
    if (selected.size === 0) {
      alert('Please select at least one post to include in the spotlight')
      return
    }

    setIsSubmitting(true)

    try {
      let coverUrl: string | null = null
      if (coverFile) {
        const uploaded = await uploadImage(coverFile)
        coverUrl = uploaded.url
      }

      // Create spotlight collection with items using RPC to handle RLS properly in a single transaction
      console.log('Selected posts before processing:', selected)
      console.log('Selected size:', selected.size)
      console.log('Selected as array:', Array.from(selected))
      
      const postIdsArray = selected.size > 0 ? Array.from(selected) : []
      
      // More permissive UUID validation - sometimes UUIDs might have different formats
      const validatedPostIds = postIdsArray.filter(id => {
        if (typeof id !== 'string') {
          console.warn('Non-string post ID found:', id, typeof id)
          return false
        }
        
        // More flexible UUID validation that handles different UUID versions including test UUIDs
        // Allow UUIDs with any version digit (0-f) since test data may use different formats
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        const isValidUuid = uuidRegex.test(id)
        
        if (!isValidUuid) {
          console.warn('Invalid UUID format for post ID:', id)
        }
        
        return isValidUuid
      })
      
      console.log('Creating spotlight with params:', {
        title_param: title.trim(),
        description_param: description.trim() || null,
        cover_image_url_param: coverUrl,
        external_id_param: user.id,
        post_ids_param: validatedPostIds,
        original_selected_size: selected.size,
        postIdsArray: postIdsArray,
        filtered_ids_count: validatedPostIds.length,
        postIdsArray_length: postIdsArray.length
      })
      
      if (selected.size > 0 && validatedPostIds.length === 0) {
        console.error('No valid post IDs found after validation:', {
          selected: Array.from(selected),
          postIdsArray,
          validatedPostIds
        })
        throw new Error('Selected post IDs are not in valid UUID format')
      }
      
      if (validatedPostIds.length === 0) {
        console.warn('No posts selected for spotlight creation')
      }
      
      const { data: collectionResult, error: insertErr } = await supabase.rpc('create_spotlight_collection_ext_with_items', {
        title_param: title.trim(),
        description_param: description.trim() || null,
        cover_image_url_param: coverUrl,
        external_id_param: user.id,
        post_ids_param: validatedPostIds
      })

      console.log('Spotlight creation response:', { collectionResult, insertErr })
      console.log('Collection result details:', JSON.stringify(collectionResult, null, 2))

      if (insertErr) {
        console.error('Failed to create spotlight collection:', insertErr)
        throw new Error(`Database error: ${insertErr.message || JSON.stringify(insertErr)}`)
      }

      if (collectionResult && collectionResult.error) {
        console.error('Function returned error:', collectionResult.error)
        throw new Error(collectionResult.error)
      }

      if (!collectionResult || !collectionResult.success) {
        console.error('Failed creation result:', collectionResult)
        throw new Error(`Failed to create spotlight collection: ${JSON.stringify(collectionResult)}`)
      }

      console.log('Spotlight created successfully! Collection ID:', collectionResult.collection_id)
      console.log('Items added:', collectionResult.items_added)

      router.push('/spotlight')
    } catch (e: any) {
      console.error('Failed to create spotlight:', e)
      alert(e?.message || 'Failed to create spotlight')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono'] text-black">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Create Spotlight</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:bg-gray-50 text-black bg-white"
              placeholder="My favorite posts"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:bg-gray-50 text-black bg-white"
              placeholder="Why this collection matters..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">Cover image (optional)</label>
            <div className="space-y-3">
              {coverPreview && (
                <div className="relative w-full max-w-md">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-black">
                    <img 
                      src={coverPreview} 
                      alt="Cover preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview(null)
                    }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  setCoverFile(file)
                  
                  // Create preview URL
                  if (file) {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setCoverPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  } else {
                    setCoverPreview(null)
                  }
                }}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-sm file:bg-white file:text-black hover:file:bg-gray-100 cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                This image will be shown as the spotlight cover. If not provided, a grid of posts will be used.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm">Select posts to include</label>
              <span className="text-xs text-gray-600">{selected.size} selected</span>
            </div>
            
            {/* Search input for posts */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title or description..."
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
              />
            </div>

            {loading ? (
              <div className="text-gray-600">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-gray-600">No posts yet. Create a post first.</div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-gray-600">No posts match your search.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredPosts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePost(p.id)}
                    className={`relative border-2 transition-colors ${
                      selected.has(p.id) ? 'border-black' : 'border-gray-200 hover:border-black'
                    }`}
                    title={p.title}
                  >
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      {p.media_url ? (
                        <img src={p.media_url} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-2 text-xs line-clamp-2">{p.title}</div>
                    {selected.has(p.id) && (
                      <div className="absolute top-2 right-2 bg-black text-white text-[10px] px-1">✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || selected.size === 0}
              className="px-4 py-2 border-2 border-black bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : selected.size === 0 ? 'Select Posts First' : 'Create Spotlight'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/spotlight')}
              className="px-4 py-2 border-2 border-black hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}

