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
}

export default function SpotlightCreatePage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
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
          .select('id, title, media_url, created_at')
          .order('created_at', { ascending: false })
          .limit(50)
        if (error) throw error
        setPosts(data || [])
      } catch (e) {
        console.error('Failed to load posts for spotlight:', e)
      } finally {
        setLoading(false)
      }
    }
    loadPosts()
  }, [])

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

      const { data: collection, error: insertErr } = await supabase
        .from('spotlight_collections')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          creator_id: user.id,
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
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:bg-gray-50"
              placeholder="My favorite posts"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black focus:outline-none focus:bg-gray-50"
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

            {loading ? (
              <div className="text-gray-600">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-gray-600">No posts yet. Create a post first.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {posts.map((p) => (
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

'use client'

import { usePosts } from '@/context/post-context'
import { useRef, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'
import { uploadImage } from '@/lib/upload'
import { useToast } from '@/hooks/use-toast'
import StaggeredMenu from '@/components/StaggeredMenu'
import Identity from '@/components/Identity'

export default function CreateSpotlight() {
  const { posts } = usePosts()
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [blurb, setBlurb] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [uploads, setUploads] = useState<{ id: string; url: string; file: File }[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggle = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const addUpload = (file: File) => {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const url = URL.createObjectURL(file)
    setUploads(prev => [...prev, { id, url, file }])
  }
  
  const save = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!user?.id) {
      toast.error('You must be logged in')
      return
    }
    if (selectedIds.size === 0 && uploads.length === 0) {
      toast.error('Add at least one post or image')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Upload cover image if any
      let coverUrl: string | null = null
      if (uploads.length > 0) {
        const result = await uploadImage(uploads[0].file, 'spotlight-covers')
        coverUrl = result.url
      }

      // Create spotlight collection
      const { data: collection, error: collectionError } = await supabase
        .from('spotlight_collections')
        .insert({
          title,
          description: blurb || null,
          cover_image_url: coverUrl,
          created_by: user.id,
          is_featured: false
        })
        .select('id')
        .single()

      if (collectionError) throw collectionError

      // Add selected posts to spotlight
      if (selectedIds.size > 0) {
        const items = Array.from(selectedIds).map((postId, index) => ({
          collection_id: collection.id,
          post_id: postId,
          order_index: index
        }))

        const { error: itemsError } = await supabase
          .from('spotlight_items')
          .insert(items)

        if (itemsError) throw itemsError
      }

      toast.success('Spotlight created successfully!')
      router.push('/spotlight')
    } catch (error: any) {
      console.error('Create spotlight failed:', error)
      toast.error(error.message || 'Failed to create spotlight')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-black mb-4">Create Spotlight</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-sm text-black mb-2">Pick posts</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {posts.map(p => (
                <button key={p.id} onClick={() => toggle(p.id)} className={`border ${selectedIds.has(p.id)?'border-black':'border-gray-300'} p-1`}> 
                  <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-black mb-1">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="w-full p-2 border border-gray-300 text-sm mb-3 text-black" />
            <label className="block text-sm text-black mb-1">Blurb</label>
            <textarea value={blurb} onChange={e=>setBlurb(e.target.value)} rows={4} className="w-full p-2 border border-gray-300 text-sm mb-3 text-black" />
            <label className="block text-sm text-black mb-2">Add images</label>
            <input type="file" accept="image/*" ref={fileRef} onChange={(e)=>{ const f=e.target.files?.[0]; if (f) addUpload(f) }} />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {uploads.map(u => (
                <div key={u.id} className="border border-gray-300 p-1">
                  <img src={u.url} alt="upload" className="w-full h-20 object-cover" />
                </div>
              ))}
            </div>
            <button 
              onClick={save} 
              disabled={isSubmitting}
              className={`mt-4 px-3 py-1 border border-black text-sm ${
                isSubmitting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'text-black hover:bg-black hover:text-white'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Save spotlight'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}


