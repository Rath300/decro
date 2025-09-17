'use client'

import { useAuth } from '@/context/auth-context'

export default function Identity() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) return <a href="/profile" className="text-sm leading-6 text-black">{user?.name || user?.email}</a>
  return <a href="/" className="text-sm leading-6 text-black">Sign In</a>
}


