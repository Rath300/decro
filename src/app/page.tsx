'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import PitchHome from '@/components/pitch/PitchHome'
import { isPitchMode } from '@/lib/pitch-mode'

export default function Home() {
  const pitch = isPitchMode()
  const { loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (pitch) return
    // Full product: `/` is the feed, not a login wall.
    router.replace('/feed')
  }, [pitch, router])

  if (pitch) {
    return <PitchHome />
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-black font-['Space_Mono'] text-sm">
        {loading ? 'Loading…' : 'Opening feed…'}
      </p>
    </div>
  )
}
