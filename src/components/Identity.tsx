'use client'

import { useAuth } from '@/context/auth-context'
import { NotificationsDropdown } from './notifications-dropdown'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'

export default function Identity() {
  const { isAuthenticated, user } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!user?.id) { setDisplayName(null); return }
      const { data } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('external_id', user.id)
        .single()
      if (!cancelled) {
        setDisplayName(data?.username || data?.full_name || user.name || user.email)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <a href="/profile" className="text-sm leading-6 text-black hover:underline font-['Space_Mono']">
          {displayName || user?.name || user?.email}
        </a>
      </div>
    )
  }
  
  return <a href="/signup" className="text-sm leading-6 text-black hover:underline font-['Space_Mono']">Sign In</a>
}


