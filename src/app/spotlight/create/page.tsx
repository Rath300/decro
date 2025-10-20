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
          .limit(100)
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

    setIsSubmitting(true)

    try {
      let coverUrl: string | null = null
      if (coverFile) {
        const uploaded = await uploadImage(coverFile)
        coverUrl = uploaded.url
      }

      // Get the profile ID from external ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('external_id', user.id)
        .single()

      if (profileError) throw new Error('Profile not found')

      const { data: collection, error: insertErr } = await supabase
        .from('spotlight_collections')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          creator_id: profileData.id,
          created_by: user.id, // Add this for RLS compatibility
          is_featured: false
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr

      const collectionId = collection.id as string

      if (selected.size > 0) {
        const items = Array.from(selected).map((postId, idx) => ({
          collection_id: collectionId,
          post_id: postId,
          order_index: idx
        }))
        const { error: itemsErr } = await supabase
          .from('spotlight_items')
          .insert(items)
        if (itemsErr) throw itemsErr
      }

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
            <label className="block text-sm mb-1">Cover image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
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
              disabled={isSubmitting}
              className="px-4 py-2 border-2 border-black bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Spotlight'}
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

