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
    description: '',
  })
  const [parentHubIds, setParentHubIds] = useState<string[]>([])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''),
    }))
  }

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in')
      return
    }
    if (!formData.name.trim() || formData.name.length < 3) {
      toast.error('Name must be at least 3 characters')
      return
    }
    if (!formData.slug || formData.slug.length < 3) {
      toast.error('Invalid slug — must be at least 3 characters')
      return
    }
    if (parentHubIds.length < 1 || parentHubIds.length > 2) {
      toast.error('Pick 1–2 parent groups for the creative web')
      return
    }
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const body = new FormData()
      body.append('name', formData.name.trim())
      body.append('slug', formData.slug)
      body.append('description', formData.description.trim())
      body.append('parentHubIds', JSON.stringify(parentHubIds))
      if (coverFile) body.append('coverFile', coverFile)

      const response = await fetch('/api/subgroups', { method: 'POST', body })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Failed to create subgroup')
      if (!result.slug) throw new Error('No slug returned from subgroup creation')

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

  const field =
    'w-full border border-black px-3 py-2.5 text-sm font-["Space_Mono"] bg-white outline-none focus:bg-black/[0.02]'
  const label =
    'block text-[10px] uppercase tracking-wide text-black/45 mb-2 font-["Space_Mono"]'

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-black p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-wide text-black/40">
            New group
          </p>
          <h1 className="mt-2 text-xl font-normal uppercase tracking-tight">
            Log in to create a subgroup
          </h1>
          <p className="mt-3 text-sm text-black/60 leading-relaxed">
            Groups hang on the creative web under parents you choose.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="border border-black bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
            >
              Log in
            </Link>
            <Link
              href="/"
              className="border border-black px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <Link
          href={pitchMode ? '/' : '/subgroup'}
          className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
        >
          {pitchMode ? '← Creative web' : '← Subgroups'}
        </Link>

        <header className="border-b border-black pb-6 mb-8">
          <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
            New group
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal uppercase tracking-tight">
            Create subgroup
          </h1>
        </header>

        <div className="space-y-6">
          <div>
            <p className={label}>Cover (optional)</p>
            <div className="border border-dashed border-black/40 p-6 text-center">
              {coverPreview ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="max-w-full h-44 mx-auto object-cover border border-black mb-4"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null)
                      setCoverPreview('')
                    }}
                    className="text-[10px] uppercase tracking-wide underline underline-offset-4 text-black/50 hover:text-black"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-black/45 mb-4">
                    Optional cover for the group page
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-black px-4 py-2 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
                  >
                    Choose image
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

          <div>
            <label htmlFor="name" className={label}>
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Street Photography"
              className={field}
              maxLength={50}
            />
          </div>

          <div>
            <label htmlFor="slug" className={label}>
              URL slug *
            </label>
            <div className="flex items-stretch border border-black">
              <span className="px-3 py-2.5 text-xs text-black/40 border-r border-black bg-black/[0.02] flex items-center">
                /subgroup/
              </span>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="street-photography"
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                maxLength={50}
              />
            </div>
            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-black/35">
              Auto from name · letters, numbers, hyphens
            </p>
          </div>

          <div>
            <label htmlFor="description" className={label}>
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="What is this group about?"
              rows={4}
              className={`${field} resize-none`}
              maxLength={500}
            />
            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-black/35 text-right">
              {formData.description.length}/500
            </p>
          </div>

          <div className="border border-black p-4 sm:p-5">
            <ParentHubPicker
              name={formData.name}
              description={formData.description}
              value={parentHubIds}
              onChange={setParentHubIds}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || parentHubIds.length < 1}
              className="border border-black bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating…' : 'Create subgroup'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="border border-black px-6 py-2.5 text-xs uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
