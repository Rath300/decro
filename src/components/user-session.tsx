'use client'

import { client } from '@/lib/auth-client'

export function UserSession() {
  const { 
    data: session, 
    isPending, // loading state
    error, // error object
    refetch // refetch the session
  } = client.useSession()

  if (isPending) {
    return <div className="text-sm text-gray-600">Loading...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">Error: {error.message}</div>
  }

  if (!session) {
    return <div className="text-sm text-gray-600">Not signed in</div>
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex flex-col">
        <span className="font-medium text-black">Welcome, {session.user.name}!</span>
        <span className="text-gray-600">{session.user.email}</span>
      </div>
      <button 
        onClick={() => client.signOut()}
        className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        Sign Out
      </button>
    </div>
  )
}