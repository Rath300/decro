'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isPitchMode } from '@/lib/pitch-mode'

/**
 * Legacy /create route. In pitch mode, open the pitch upload sheet on home.
 */
export default function CreatePage() {
  const router = useRouter()

  useEffect(() => {
    if (isPitchMode()) {
      try {
        window.dispatchEvent(new CustomEvent('pitch:open-upload'))
      } catch {
        /* ignore */
      }
      router.replace('/')
      return
    }
    router.replace('/feed')
  }, [router])

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center">
      <p className="text-[10px] uppercase tracking-wide text-black/40">
        Opening upload…
      </p>
    </div>
  )
}
