/**
 * Edit Post Page
 * Edit existing post title, description, and tags
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const postId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[]
  })
  const [tagInput, setTagInput] = useState('')
  const [postData, setPostData] = useState<any>(null)

  useEffect(() => {
    if (!authLoading) {
      loadPost()
    }
  }, [postId, authLoading])

  const loadPost = async () => {
    try {
      // Load post data
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, title, description, creator_id, media_url')
        .eq('id', postId)
        .single()

      if (postError) throw postError

      // Check ownership - need to map external ID to profile UUID
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single()

        if (profileError || !profileData || post.creator_id !== profileData.id) {
          toast.error('You can only edit your own posts')
          router.push('/feed')
          return
        }
      } else {
        toast.error('You must be logged in to edit posts')
        router.push('/feed')
        return
      }

      setPostData(post)

      // Load tags
      const { data: tags, error: tagsError } = await supabase
        .from('post_tags')
        .select(`
          tags (name)
        `)
        .eq('post_id', postId)

      const tagNames = tags?.map((t: any) => t.tags.name) || []

      setFormData({
        title: post.title,
        description: post.description || '',
        tags: tagNames
      })
    } catch (error) {
      console.error('Failed to load post:', error)
      toast.error('Failed to load post')
      router.push('/feed')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!user?.id) {
      toast.error('You must be logged in to edit posts')
      return
    }

    setSaving(true)

    try {
      const { data: updateResult, error: updateError } = await callRpc<any>('update_post_ext', {
        post_id_param: postId,
        title_param: formData.title.trim(),
        description_param: formData.description.trim() || null
      })

      if (updateError) throw new Error(updateError.message)

      if (updateResult && updateResult.success === false) {
        throw new Error(updateResult.error || 'Failed to update post')
      }

      // Replaces the old delete-then-insert loop against post_tags, which
      // depended on an always-true insert policy and did not check ownership.
      const { error: tagsError } = await callRpc('set_post_tags_ext', {
        post_id_param: postId,
        tags_param: formData.tags,
      })

      if (tagsError) throw new Error(tagsError.message)

      toast.success('Post updated successfully!')
      router.push('/feed')
    } catch (error: any) {
      console.error('Failed to update post:', error)
      toast.error(error.message || 'Failed to update post')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Post</h1>
          <p className="text-gray-600 text-sm">
            Update your post&apos;s title, description, and tags
          </p>
        </div>

        {/* Preview Image */}
        {postData?.media_url && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-3">
              Preview
            </label>
            <img
              src={postData.media_url}
              alt="Post preview"
              className="max-w-full h-64 object-cover border-2 border-gray-300"
            />
            <p className="text-xs text-gray-500 mt-2">
              Note: Media files cannot be changed. To change the media, delete this post and create a new one.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-black mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Give your work a title..."
              className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Tell us about your work..."
              rows={4}
              className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm resize-none text-black bg-white"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formData.description.length}/500
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Tags (press Enter to add)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  e.preventDefault()
                  const tag = tagInput.trim().toLowerCase()
                  if (!formData.tags.includes(tag) && formData.tags.length < 5) {
                    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                    setTagInput('')
                  }
                }
              }}
              placeholder="e.g., photography, landscape, sunset..."
              className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm"
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-black text-white text-xs flex items-center gap-1">
                    #{tag}
                    <button
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, i) => i !== index)
                      }))}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {formData.tags.length}/5 tags
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 py-3 text-sm font-medium border-2 border-black transition-colors ${
                saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => router.back()}
              disabled={saving}
              className="px-6 py-3 text-sm border-2 border-gray-300 hover:border-black transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}


