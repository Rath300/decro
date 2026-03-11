/**
 * Profile Edit Page
 * Edit username, full name, bio, and avatar
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { uploadAvatar } from '@/lib/upload'
import { useToast } from '@/hooks/use-toast'

export default function EditProfilePage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [originalUsername, setOriginalUsername] = useState<string>('')

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      return
    }

    loadProfile()
  }, [user?.id, isAuthenticated])

  const loadProfile = async () => {
    if (!user?.id) return

    try {
      let resolvedProfileId = profileId

      if (!resolvedProfileId) {
        try {
          const { data: ensuredId } = await supabase
            .rpc('ensure_profile', { external_id_param: user.id })
          if (ensuredId) {
            resolvedProfileId = ensuredId as string
            setProfileId(resolvedProfileId)
          }
        } catch (ensureError) {
          console.warn('ensure_profile failed, falling back to direct lookup:', ensureError)
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

      if (!error && data) {
        if (data.id) {
          setProfileId(data.id)
        }
        const safeUsername = data.username || user.email?.split('@')[0] || ''
        setFormData({
          username: safeUsername,
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || ''
        })
        setAvatarPreview(data.avatar_url || '')
        setOriginalUsername(safeUsername)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB')
        return
      }

      setAvatarFile(file)
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    }
  }

  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const normalized = username.trim()
    if (!normalized) return true
    if (normalized.toLowerCase() === (originalUsername || '').toLowerCase()) return true

    try {
      // Use case-insensitive RPC function to check username availability
      const { data: existingProfile, error } = await supabase
        .rpc('get_profile_by_username', { username_param: normalized })
        .maybeSingle() as { data: { id: string } | null; error: any }

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      // If profile exists and it's not the current user's profile, username is taken
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

    // Validation
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
    
    // Prevent double submission
    if (saving) return

    setSaving(true)

    try {
      // Check username availability
      const isAvailable = await checkUsernameAvailable(formData.username)
      if (!isAvailable) {
        toast.error('Username is already taken')
        setSaving(false)
        return
      }

      let avatarUrl = formData.avatar_url

      // Upload avatar if changed
      if (avatarFile) {
        setUploading(true)
        try {
          const result = await uploadAvatar(avatarFile)
          avatarUrl = result.url
        } catch (uploadError) {
          toast.error('Failed to upload avatar')
          setSaving(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      let targetProfileId = profileId

      if (!targetProfileId) {
        try {
          const { data: ensuredId, error: ensureError } = await supabase
            .rpc('ensure_profile', { external_id_param: user.id })
          if (ensureError) throw ensureError
          if (ensuredId) {
            targetProfileId = ensuredId as string
            setProfileId(targetProfileId)
          }
        } catch (ensureError) {
          console.error('Failed to resolve profile id:', ensureError)
          throw ensureError
        }
      }

      const usernameNormalized = formData.username.trim()

      // Update profile
      const updateBuilder = supabase
        .from('profiles')
        .update({
          username: usernameNormalized,
          full_name: formData.full_name.trim() || null,
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl || null,
          external_id: user.id
        })

      const { error } = targetProfileId
        ? await updateBuilder.eq('id', targetProfileId)
        : await updateBuilder.eq('external_id', user.id)

      if (error) {
        console.error('Profile update error:', error)
        throw error
      }

      toast.success('Profile updated successfully!')
      setOriginalUsername(usernameNormalized)
      
      // Redirect to the updated profile URL
      router.push(`/profile/${usernameNormalized}`)
      router.refresh()
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pb-8 sm:pb-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Profile</h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Update your profile information and avatar
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Avatar Upload */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-black mb-2 sm:mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center text-2xl sm:text-3xl font-bold text-gray-600">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50 text-black bg-white text-xs sm:text-sm"
                >
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">JPG, PNG or GIF. Max 5MB.</p>
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-black mb-2">
              Username *
            </label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="your_username"
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
              maxLength={30}
            />
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
              Letters, numbers, and underscores only. Minimum 3 characters.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-xs sm:text-sm font-medium text-black mb-2">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="John Doe"
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm text-black bg-white"
              maxLength={100}
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-xs sm:text-sm font-medium text-black mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full p-2.5 sm:p-3 border-2 border-gray-300 focus:border-black focus:outline-none text-sm resize-none text-black bg-white"
              maxLength={500}
            />
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 text-right">
              {formData.bio.length}/500
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className={`flex-1 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-2 border-black transition-colors ${
                saving || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Changes'}
            </button>
            <button
              onClick={() => router.back()}
              disabled={saving || uploading}
              className="px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm border-2 border-gray-300 hover:border-black transition-colors disabled:opacity-50 text-black bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}


