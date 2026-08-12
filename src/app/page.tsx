'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import LoginForm from '@/components/login-form'
import PitchHome from '@/components/pitch/PitchHome'
import { isPitchMode } from '@/lib/pitch-mode'

export default function Home() {
  const pitch = isPitchMode()
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (pitch) return
    if (!loading && isAuthenticated) {
      router.push('/feed')
    }
  }, [pitch, isAuthenticated, loading, router])

  // Pitch product surface is the creative web — never the old login landing.
  if (pitch) {
    return <PitchHome />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black font-['Space_Mono']">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return <LoginForm />
}
