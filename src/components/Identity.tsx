'use client'

import { useAuth } from '@/context/auth-context'
import { NotificationsDropdown } from './notifications-dropdown'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'

export default function Identity() {
  const { isAuthenticated, user, signOut } = useAuth()
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setShowDropdown(false)
    router.push('/')
    router.refresh()
  }
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-sm leading-6 text-black hover:underline font-['Space_Mono'] cursor-pointer"
          >
            {displayName || user?.name || user?.email}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-black shadow-lg z-50">
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-black hover:bg-gray-100 font-['Space_Mono']"
                onClick={() => setShowDropdown(false)}
              >
                View Profile
              </a>
              <a
                href="/settings"
                className="block px-4 py-2 text-sm text-black hover:bg-gray-100 font-['Space_Mono']"
                onClick={() => setShowDropdown(false)}
              >
                Settings
              </a>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 font-['Space_Mono'] border-t border-gray-200"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return <a href="/signup" className="text-sm leading-6 text-black hover:underline font-['Space_Mono']">Sign In</a>
}


