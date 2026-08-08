/**
 * Create Subgroup Page
 * Form to create a new subgroup/niche
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import ParentHubPicker from '@/components/subgroup/ParentHubPicker'
import { isPitchMode } from '@/lib/pitch-mode'

export default function CreateSubgroupPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const pitchMode = isPitchMode()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })
  const [parentHubIds, setParentHubIds] = useState<string[]>([])
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

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in')
      return
    }

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

    if (parentHubIds.length < 1 || parentHubIds.length > 2) {
      toast.error('Pick 1–2 parent groups for the creative web')
      return
    }

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      // Cover upload has to go through the authenticated API route; the browser
      // cannot call create_subgroup_ext with a cover URL alone after EXECUTE was
      // revoked from anon.
      const body = new FormData()
      body.append('name', formData.name.trim())
      body.append('slug', formData.slug)
      body.append('description', formData.description.trim())
      body.append('parentHubIds', JSON.stringify(parentHubIds))
      if (coverFile) {
        body.append('coverFile', coverFile)
      }

      const response = await fetch('/api/subgroups', {
        method: 'POST',
        body,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subgroup')
      }

      if (!result.slug) {
        throw new Error('No slug returned from subgroup creation')
      }

      const under = result.placement?.parentLabels?.length
        ? ` Added under ${result.placement.parentLabels.join(' + ')} on the web.`
        : ' It will show on the creative web near related groups.'
      toast.success(`Subgroup created.${under}`)
      router.push(`/subgroup/${result.slug}`)
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
      <div className="min-h-screen bg-white flex items-center justify-center font-['Space_Mono']">
        <div className="text-center px-4">
          <p className="mb-4 text-sm">Log in to create a subgroup</p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-black text-white text-xs uppercase"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main
        className={`max-w-2xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12 ${
          pitchMode ? 'pt-6' : 'pt-20 sm:pt-24'
        }`}
      >
        <div className="mb-8">
          {pitchMode && (
            <Link
              href="/"
              className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-4"
            >
              ← Creative web
            </Link>
          )}
          <h1 className="text-3xl font-normal mb-2 uppercase tracking-tight">
            Create subgroup
          </h1>
          <p className="text-black/60 text-sm">
            Name your niche, then choose which parent groups it hangs under on the
            web. We suggest — you confirm.
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

          <div className="border border-black p-4">
            <ParentHubPicker
              name={formData.name}
              description={formData.description}
              value={parentHubIds}
              onChange={setParentHubIds}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || parentHubIds.length < 1}
              className={`flex-1 py-3 text-sm font-medium border-2 border-black transition-colors ${
                isSubmitting || parentHubIds.length < 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isSubmitting ? 'Creating...' : 'Create Subgroup'}
            </button>
            <button
              onClick={() => router.back()}
              disabled={isSubmitting}
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
