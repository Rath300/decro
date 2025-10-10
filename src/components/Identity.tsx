'use client'

import { useAuth } from '@/context/auth-context'
import { NotificationsDropdown } from './notifications-dropdown'

export default function Identity() {
  const { isAuthenticated, user } = useAuth()
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <a href="/profile" className="text-sm leading-6 text-black hover:underline font-['Space_Mono']">
          {user?.name || user?.email}
        </a>
      </div>
    )
  }
  
  return <a href="/" className="text-sm leading-6 text-black hover:underline font-['Space_Mono']">Sign In</a>
}


