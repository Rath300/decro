'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import supabase from '@/lib/supabase-client'

type GroupHit = { id: string; name: string; slug: string }

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (postId: string) => void
  preferredGroup?: GroupHit | null
}

type ContentType = 'image' | 'music' | 'video' | 'text'

async function uploadPitch(
  kind: 'image' | 'audio' | 'video',
  body: Blob,
  fileName: string,
  contentType: string
) {
  const response = await fetch('/api/pitch/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      fileName,
      contentType,
      size: body.size,
      website: '',
    }),
  })
  const signed = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(signed?.error || 'Could not start upload')

  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, body, {
      contentType,
      cacheControl: '3600',
    })
  if (error) throw new Error(error.message || 'Upload failed')
  return signed.publicUrl as string
}

export default function PitchUploadSheet({
  open,
  onClose,
  onCreated,
  preferredGroup = null,
}: Props) {
  const [contentType, setContentType] = useState<ContentType>('image')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [username, setUsername] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [groupQuery, setGroupQuery] = useState('')
  const [groupHits, setGroupHits] = useState<GroupHit[]>([])
  const [selectedGroup, setSelectedGroup] = useState<GroupHit | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const honeypotRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (preferredGroup) setSelectedGroup(preferredGroup)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, preferredGroup])

  useEffect(() => {
    if (!groupQuery.trim() || selectedGroup) {
      setGroupHits([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/subgroups?query=${encodeURIComponent(groupQuery.trim())}`
        )
        const data = await res.json()
        setGroupHits(data.items || [])
      } catch {
        setGroupHits([])
      }
    }, 220)
    return () => clearTimeout(t)
  }, [groupQuery, selectedGroup])

  const accept = useMemo(() => {
    if (contentType === 'music') return 'audio/*'
    if (contentType === 'video') return 'video/*'
    if (contentType === 'text') return undefined
    return 'image/*'
  }, [contentType])

  const onFile = (f: File | null) => {
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    if (f && f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview('')
    }
  }

  const reset = () => {
    setTitle('')
    setDescription('')
    setUsername('')
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
    setGroupQuery('')
    setGroupHits([])
    setSelectedGroup(null)
    setNewGroupName('')
    setError('')
    setContentType('image')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')

    if (honeypotRef.current?.value) {
      setError('Rejected')
      return
    }
    if (!selectedGroup && newGroupName.trim().length < 3) {
      setError('Pick a group or create one (3+ characters)')
      return
    }
    if (contentType !== 'text' && !file) {
      setError('Add a file')
      return
    }

    setSubmitting(true)
    try {
      let mediaUrl: string | null = null
      let audioUrl: string | null = null
      let videoUrl: string | null = null

      if (file) {
        if (contentType === 'music') {
          audioUrl = await uploadPitch('audio', file, file.name, file.type || 'audio/mpeg')
        } else if (contentType === 'video') {
          videoUrl = await uploadPitch('video', file, file.name, file.type || 'video/mp4')
        } else if (contentType === 'image') {
          mediaUrl = await uploadPitch('image', file, file.name, file.type || 'image/jpeg')
        }
      }

      const res = await fetch('/api/pitch/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          username,
          contentType,
          mediaUrl,
          audioUrl,
          videoUrl,
          subgroupId: selectedGroup?.id ?? null,
          newGroupName: selectedGroup ? '' : newGroupName.trim(),
          website: '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to post')

      onCreated(data.id as string)
      reset()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        aria-label="Close upload"
        className="absolute inset-0 bg-black/20"
        onClick={handleClose}
      />
      <aside className="relative h-full w-full max-w-md bg-white border-l border-black overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-full p-5 sm:p-6 gap-5 font-['Space_Mono']">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-['Space_Grotesk'] font-bold text-2xl tracking-tight">Upload</h2>
              <p className="text-xs text-black/60 mt-1">Optional username. Lands on the web.</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="border border-black px-3 py-1 text-xs uppercase hover:bg-black hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {(['image', 'music', 'video', 'text'] as ContentType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setContentType(t)
                  onFile(null)
                }}
                className={`border border-black py-2 text-[10px] uppercase ${
                  contentType === t ? 'bg-black text-white' : 'bg-white text-black'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {contentType !== 'text' && (
            <div>
              <label className="block text-xs mb-2 uppercase">File</label>
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                onChange={(e) => onFile(e.target.files?.[0] || null)}
                className="block w-full text-xs"
              />
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="mt-3 w-full max-h-48 object-cover border border-black" />
              )}
            </div>
          )}

          <div>
            <label className="block text-xs mb-2 uppercase">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full border border-black px-3 py-2 text-sm bg-white outline-none focus:bg-black focus:text-white"
              placeholder="Untitled"
            />
          </div>

          <div>
            <label className="block text-xs mb-2 uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full border border-black px-3 py-2 text-sm bg-white outline-none resize-none focus:bg-black focus:text-white"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-xs mb-2 uppercase">Username (optional)</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              className="w-full border border-black px-3 py-2 text-sm bg-white outline-none focus:bg-black focus:text-white"
              placeholder="anonymous"
            />
          </div>

          <div>
            <label className="block text-xs mb-2 uppercase">Group</label>
            {selectedGroup ? (
              <div className="flex items-center justify-between border border-black px-3 py-2">
                <span className="text-sm uppercase">{selectedGroup.name}</span>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => setSelectedGroup(null)}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  value={groupQuery}
                  onChange={(e) => setGroupQuery(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-sm bg-white outline-none"
                  placeholder="Search groups"
                />
                {groupHits.length > 0 && (
                  <ul className="mt-1 border border-black border-t-0 max-h-40 overflow-y-auto">
                    {groupHits.map((g) => (
                      <li key={g.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs uppercase hover:bg-black hover:text-white"
                          onClick={() => {
                            setSelectedGroup(g)
                            setGroupQuery('')
                            setNewGroupName('')
                          }}
                        >
                          {g.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[10px] text-black/50 mt-3 mb-1">Or create one</p>
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-sm bg-white outline-none"
                  placeholder="New group name"
                />
              </>
            )}
          </div>

          {/* Honeypot */}
          <input
            ref={honeypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />

          {error && <p className="text-xs text-red-700 border border-red-700 px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-auto border border-black bg-black text-white py-3 text-sm uppercase tracking-wide disabled:opacity-50 hover:bg-white hover:text-black"
          >
            {submitting ? 'Posting…' : 'Post to the web'}
          </button>
        </form>
      </aside>
    </div>
  )
}
