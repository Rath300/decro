/**
 * Create Subgroup Page
 * Form to create a new subgroup/niche
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { uploadImage } from '@/lib/upload'
import { useToast } from '@/hooks/use-toast'
// Global header/menu are provided by layout

export default function CreateSubgroupPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string>('')

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }))
  }

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }

      setCoverFile(file)
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

  const checkSlugAvailable = async (slug: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('subgroups')
        .select('id')
        .eq('slug', slug)
        .single()

      return !data
    } catch {
      return true
    }
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in')
      return
    }

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (formData.name.length < 3) {
      toast.error('Name must be at least 3 characters')
      return
    }

    if (!formData.slug || formData.slug.length < 3) {
      toast.error('Invalid slug - must be at least 3 characters')
      return
    }
    
    // Prevent double submission
    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      // Check slug availability
      const isAvailable = await checkSlugAvailable(formData.slug)
      if (!isAvailable) {
        toast.error('This name/slug is already taken')
        setIsSubmitting(false)
        return
      }

      let coverUrl: string | null = null

      // Upload cover image if provided
      if (coverFile) {
        setUploadingCover(true)
        try {
          const result = await uploadImage(coverFile, 'media')
          coverUrl = result.url
        } catch (uploadError) {
          toast.error('Failed to upload cover image')
          setIsSubmitting(false)
          setUploadingCover(false)
          return
        }
        setUploadingCover(false)
      }

      // Create subgroup (created_by is TEXT, not UUID - use external_id)
      const { data, error } = await supabase
        .from('subgroups')
        .insert({
          name: formData.name.trim(),
          slug: formData.slug,
          description: formData.description.trim() || null,
          cover_image_url: coverUrl,
          created_by: user.id
        })
        .select('slug')
        .single()

      if (error) {
        console.error('Failed to create subgroup:', error)
        throw error
      }
      
      if (!data || !data.slug) {
        throw new Error('No slug returned from subgroup creation')
      }

      toast.success('Subgroup created successfully!')
      router.push(`/subgroup/${data.slug}`)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to create subgroup:', error)
      toast.error(error.message || 'Failed to create subgroup')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">You must be logged in to create a subgroup</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-black text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 pt-20 sm:pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Subgroup</h1>
          <p className="text-gray-600 text-sm">
            Create a community around a specific niche or interest
          </p>
        </div>

        <div className="space-y-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Cover Image (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {coverPreview ? (
                <div>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="max-w-full h-48 mx-auto object-cover rounded-lg mb-4"
                  />
                  <button
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview('')
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">🖼️</div>
                  <p className="text-sm text-gray-600 mb-4">
                    Add a cover image for your subgroup
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    Choose Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
              Subgroup Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Street Photography"
              className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
              maxLength={50}
            />
          </div>

          {/* Slug (Auto-generated) */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-black mb-2">
              URL Slug *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">/subgroup/</span>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="street-photography"
                className="flex-1 p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
                maxLength={50}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Auto-generated from name. Letters, numbers, and hyphens only.
            </p>
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
              placeholder="What is this subgroup about?"
              rows={4}
              className="w-full p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm resize-none text-black bg-white"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formData.description.length}/500
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || uploadingCover}
              className={`flex-1 py-3 text-sm font-medium border-2 border-black transition-colors ${
                isSubmitting || uploadingCover
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isSubmitting
                ? 'Creating...'
                : uploadingCover
                ? 'Uploading Image...'
                : 'Create Subgroup'}
            </button>
            <button
              onClick={() => router.back()}
              disabled={isSubmitting || uploadingCover}
              className="px-6 py-3 text-sm border-2 border-gray-300 hover:border-black transition-colors disabled:opacity-50 text-black bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

