/**
 * Profile Edit Page — pitch-aligned
 * Edit username, full name, bio, and avatar
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { uploadAvatar } from '@/lib/upload'
import { useToast } from '@/hooks/use-toast'
import { isPitchMode } from '@/lib/pitch-mode'

export default function EditProfilePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const pitchMode = isPitchMode()
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [originalUsername, setOriginalUsername] = useState('')
  const [previewBroken, setPreviewBroken] = useState(false)

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push(pitchMode ? '/login' : '/')
      return
    }
    void loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAuthenticated, authLoading])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      // ensure_profile is revoked from anon — go through /api/rpc
      let resolvedProfileId = profileId
      if (!resolvedProfileId) {
        const { data: ensuredId, error: ensureErr } = await callRpc<string>(
          'ensure_profile'
        )
        if (!ensureErr && ensuredId) {
          resolvedProfileId = ensuredId
          setProfileId(ensuredId)
        }
      }

      const query = resolvedProfileId
        ? supabase
            .from('profiles')
            .select('id, username, full_name, bio, avatar_url, external_id')
            .eq('id', resolvedProfileId)
            .limit(1)
        : supabase
            .from('profiles')
            .select('id, username, full_name, bio, avatar_url, external_id')
            .eq('external_id', user.id)
            .limit(1)

      const { data, error } = await query.maybeSingle()

      if (error) throw error

      if (data) {
        if (data.id) setProfileId(data.id)
        const safeUsername = data.username || user.email?.split('@')[0] || ''
        setFormData({
          username: safeUsername,
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
        })
        setAvatarPreview(data.avatar_url || '')
        setPreviewBroken(false)
        setOriginalUsername(safeUsername)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      toast.error('Could not load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }
    if (avatarPreview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(avatarPreview)
      } catch {
        /* ignore */
      }
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setPreviewBroken(false)
  }

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const normalized = username.trim()
    if (!normalized) return true
    if (normalized.toLowerCase() === (originalUsername || '').toLowerCase()) {
      return true
    }

    try {
      const { data: existingProfile, error } = (await supabase
        .rpc('get_profile_by_username', { username_param: normalized })
        .maybeSingle()) as { data: { id: string } | null; error: any }

      if (error && error.code !== 'PGRST116') throw error

      if (existingProfile && profileId && existingProfile.id !== profileId) {
        return false
      }
      return !existingProfile || Boolean(profileId && existingProfile.id === profileId)
    } catch (err) {
      console.warn('Username availability check failed:', err)
      return true
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('You must be logged in')
      return
    }
    if (!formData.username.trim()) {
      toast.error('Username is required')
      return
    }
    if (formData.username.length < 3) {
      toast.error('Username must be at least 3 characters')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, and underscores')
      return
    }
    if (saving) return

    setSaving(true)
    try {
      const isAvailable = await checkUsernameAvailable(formData.username)
      if (!isAvailable) {
        toast.error('Username is already taken')
        setSaving(false)
        return
      }

      let avatarUrl = formData.avatar_url

      if (avatarFile) {
        setUploading(true)
        try {
          const result = await uploadAvatar(avatarFile)
          avatarUrl = result.url
          setFormData((prev) => ({ ...prev, avatar_url: result.url }))
          setAvatarPreview(result.url)
        } catch {
          toast.error('Failed to upload avatar')
          setSaving(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      if (!profileId) {
        const { data: ensuredId, error: ensureError } =
          await callRpc<string>('ensure_profile')
        if (ensureError) throw new Error(ensureError.message)
        if (ensuredId) setProfileId(ensuredId)
      }

      const usernameNormalized = formData.username.trim()

      const { error } = await callRpc('update_profile_ext', {
        username_param: usernameNormalized,
        full_name_param: formData.full_name.trim() || null,
        bio_param: formData.bio.trim() || null,
        avatar_url_param: avatarUrl || null,
      })

      if (error) throw new Error(error.message)

      toast.success('Profile updated')
      setOriginalUsername(usernameNormalized)
      // Stay on the pitch own-profile page — not the old /profile/[username] chrome
      router.push(pitchMode ? '/profile' : `/profile/${usernameNormalized}`)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const field =
    'w-full border border-black px-3 py-2.5 text-sm font-["Space_Mono"] bg-white outline-none'
  const label =
    'block text-[10px] uppercase tracking-wide text-black/45 mb-2 font-["Space_Mono"]'

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-wide text-black/40">
          Loading…
        </p>
      </div>
    )
  }

  const initial =
    formData.username?.[0]?.toUpperCase() ||
    user?.name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
        <Link
          href="/profile"
          className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
        >
          ← Profile
        </Link>

        <header className="border-b border-black pb-6 mb-8">
          <p className="text-[10px] uppercase tracking-wide text-black/40 mb-2">
            Account
          </p>
          <h1 className="text-2xl sm:text-3xl font-normal uppercase tracking-tight">
            Edit profile
          </h1>
        </header>

        <div className="space-y-6">
          <div>
            <p className={label}>Photo</p>
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 border border-black overflow-hidden flex items-center justify-center text-2xl uppercase bg-white shrink-0">
                {avatarPreview && !previewBroken ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={() => setPreviewBroken(true)}
                  />
                ) : (
                  initial
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="border border-black px-4 py-2 text-xs uppercase tracking-wide hover:bg-black hover:text-white disabled:opacity-40"
                >
                  {uploading ? 'Uploading…' : 'Change photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-[10px] uppercase tracking-wide text-black/35 mt-2">
                  JPG, PNG, GIF · max 5MB
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="username" className={label}>
              Username *
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="your_username"
              className={field}
              maxLength={30}
            />
            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-black/35">
              Letters, numbers, underscores · min 3
            </p>
          </div>

          <div>
            <label htmlFor="full_name" className={label}>
              Display name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, full_name: e.target.value }))
              }
              placeholder="Your name"
              className={field}
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="bio" className={label}>
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="A short bio"
              rows={4}
              className={`${field} resize-none`}
              maxLength={500}
            />
            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-black/35 text-right">
              {formData.bio.length}/500
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="border border-black bg-black text-white px-6 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
            >
              {saving ? 'Saving…' : uploading ? 'Uploading…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/profile')}
              disabled={saving || uploading}
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
