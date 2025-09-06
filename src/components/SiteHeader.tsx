'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

interface Props {
  active: 'feed' | 'spotlight' | 'explore' | 'portfolios' | 'profile'
}

export function SiteHeader({ active }: Props) {
  const router = useRouter()
  const { isAuthenticated, user, signOut } = useAuth()

  const tabs = [
    { id: 'feed', label: 'Feed', href: '/feed' },
    { id: 'spotlight', label: 'Spotlight', href: '/spotlight' },
    { id: 'explore', label: 'Subgroup', href: '/subgroup' },
    { id: 'profile', label: 'Profile', href: '/profile' },
  ] as const

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-3 items-end h-16">
          {/* Left: Brand + Logout */}
          <div className="flex items-center gap-3 pb-1">
            <button
              onClick={async () => { await signOut(); router.push('/') }}
              className="hidden sm:inline text-sm font-['Space_Mono'] text-black hover:text-gray-600"
            >
              Log out
            </button>
            <h1 className="text-base sm:text-xl font-['Space_Mono'] font-semibold">Title</h1>
          </div>

          {/* Center: Tabs */}
          <nav className="justify-self-center pb-0">
            <div className="flex gap-2 sm:gap-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.href)}
                  className={`w-28 sm:w-40 h-8 text-xs sm:text-sm font-['Space_Mono'] border border-black transition-all active:scale-95 flex items-center justify-center ${
                    active === tab.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Right: Create + Feedback + Auth */}
          <div className="flex items-center justify-end gap-2 sm:gap-4 pb-1">
            <button
              onClick={() => router.push('/create')}
              aria-label="Create Post"
              className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 bg-black text-white border border-black hover:bg-black"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => router.push('/feedback')}
              className="text-xs font-['Space_Mono'] text-gray-500 hover:text-black"
            >
              Feedback
            </button>
            {isAuthenticated ? (
              <span className="hidden sm:inline text-xs font-['Space_Mono'] text-green-600 truncate max-w-[120px]">
                {user?.name || user?.email}
              </span>
            ) : (
              <button onClick={() => router.push('/')} className="text-xs font-['Space_Mono'] text-blue-600 hover:text-blue-800">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader


import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

interface Props {
  active: 'feed' | 'spotlight' | 'explore' | 'portfolios' | 'profile'
}

export function SiteHeader({ active }: Props) {
  const router = useRouter()
  const { isAuthenticated, user, signOut } = useAuth()

  const tabs = [
    { id: 'feed', label: 'Feed', href: '/feed' },
    { id: 'spotlight', label: 'Spotlight', href: '/spotlight' },
    { id: 'explore', label: 'Subgroup', href: '/subgroup' },
    { id: 'profile', label: 'Profile', href: '/profile' },
  ] as const

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="grid grid-cols-3 items-end h-16">
          {/* Left: Brand + Logout */}
          <div className="flex items-center gap-3 pb-1">
            <button
              onClick={async () => { await signOut(); router.push('/') }}
              className="hidden sm:inline text-sm font-['Space_Mono'] text-black hover:text-gray-600"
            >
              Log out
            </button>
            <h1 className="text-base sm:text-xl font-['Space_Mono'] font-semibold">Title</h1>
          </div>

          {/* Center: Tabs */}
          <nav className="justify-self-center pb-0">
            <div className="flex gap-2 sm:gap-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.href)}
                  className={`w-28 sm:w-40 h-8 text-xs sm:text-sm font-['Space_Mono'] border border-black transition-all active:scale-95 flex items-center justify-center ${
                    active === tab.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Right: Create + Feedback + Auth */}
          <div className="flex items-center justify-end gap-2 sm:gap-4 pb-1">
            <button
              onClick={() => router.push('/create')}
              aria-label="Create Post"
              className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 bg-black text-white border border-black hover:bg-black"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <button
              onClick={() => router.push('/feedback')}
              className="text-xs font-['Space_Mono'] text-gray-500 hover:text-black"
            >
              Feedback
            </button>
            {isAuthenticated ? (
              <span className="hidden sm:inline text-xs font-['Space_Mono'] text-green-600 truncate max-w-[120px]">
                {user?.name || user?.email}
              </span>
            ) : (
              <button onClick={() => router.push('/')} className="text-xs font-['Space_Mono'] text-blue-600 hover:text-blue-800">
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader

