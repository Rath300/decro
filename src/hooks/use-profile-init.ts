/**
 * Profile Initialization Hook
 * Ensures user profile exists and is ready before allowing interactions
 */

'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'

interface ProfileStatus {
  isReady: boolean
  profileId: string | null
  username: string | null
  error: Error | null
  retrying: boolean
}

export function useProfileInit() {
  const { user, isAuthenticated } = useAuth()
  const [status, setStatus] = useState<ProfileStatus>({
    isReady: false,
    profileId: null,
    username: null,
    error: null,
    retrying: false
  })

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setStatus({
        isReady: true, // Allow viewing without profile
        profileId: null,
        username: null,
        error: null,
        retrying: false
      })
      return
    }

    let retryCount = 0
    const maxRetries = 5
    let timeoutId: NodeJS.Timeout

    const initializeProfile = async () => {
      try {
        setStatus(prev => ({ ...prev, retrying: true }))

        // Step 1: Try to get existing profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('external_id', user.id)
          .maybeSingle()

        // Profile exists - we're ready!
        if (existingProfile && !profileError) {
          console.log('✅ Profile found:', existingProfile.username)
          setStatus({
            isReady: true,
            profileId: existingProfile.id,
            username: existingProfile.username,
            error: null,
            retrying: false
          })
          return
        }

        // Step 2: Profile doesn't exist - trigger creation via RPC
        console.log(`🔄 Profile not found, creating... (attempt ${retryCount + 1}/${maxRetries})`)
        
        const username = user.name || user.email?.split('@')[0] || 'user'
        
        const { data: profileId, error: upsertError } = await supabase.rpc('upsert_profile_from_external', {
          external_id_param: user.id,
          username_param: username,
          full_name_param: user.name || null
        })

        if (upsertError) {
          throw new Error(`Profile creation failed: ${upsertError.message}`)
        }

        if (profileId) {
          console.log('✅ Profile created:', profileId)
          
          // Verify profile was created
          const { data: verifyProfile } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('external_id', user.id)
            .maybeSingle()

          if (verifyProfile) {
            setStatus({
              isReady: true,
              profileId: verifyProfile.id,
              username: verifyProfile.username,
              error: null,
              retrying: false
            })
            return
          }
        }

        // Step 3: Retry if we're still not ready
        retryCount++
        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000) // Exponential backoff, max 8s
          console.log(`⏳ Retrying in ${delay}ms...`)
          timeoutId = setTimeout(initializeProfile, delay)
        } else {
          throw new Error('Profile initialization timeout after multiple attempts')
        }
      } catch (error) {
        console.error('❌ Profile initialization error:', error)
        setStatus({
          isReady: false,
          profileId: null,
          username: null,
          error: error instanceof Error ? error : new Error('Unknown error'),
          retrying: false
        })
      }
    }

    initializeProfile()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [user?.id, isAuthenticated])

  return status
}

/**
 * Lightweight profile check - doesn't create, just checks if ready
 */
export function useProfileCheck() {
  const { user, isAuthenticated } = useAuth()
  const [profileExists, setProfileExists] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setProfileExists(null)
      return
    }

    const checkProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Profile check error:', error)
          setProfileExists(false)
          return
        }

        setProfileExists(!!data)
      } catch (err) {
        console.error('Profile check failed:', err)
        setProfileExists(false)
      }
    }

    checkProfile()

    // Recheck every 2 seconds if profile doesn't exist yet
    let interval: NodeJS.Timeout
    if (profileExists === false) {
      interval = setInterval(checkProfile, 2000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [user?.id, isAuthenticated, profileExists])

  return profileExists
}
