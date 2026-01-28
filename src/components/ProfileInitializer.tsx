/**
 * Profile Initializer Component
 * Ensures user profile is created and ready before allowing interactions
 */

'use client'

import { useProfileInit } from '@/hooks/use-profile-init'

function PageLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-['Space_Mono']">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-transparent mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}

interface ProfileInitializerProps {
  children: React.ReactNode
  requireProfile?: boolean
}

export function ProfileInitializer({ 
  children, 
  requireProfile = false 
}: ProfileInitializerProps) {
  const { isReady, error, retrying } = useProfileInit()

  // If profile not required (e.g., for public pages), render immediately
  if (!requireProfile) {
    return <>{children}</>
  }

  // Show loading while initializing
  if (retrying || !isReady) {
    return (
      <PageLoader message="Setting up your profile..." />
    )
  }

  // Show error if initialization failed
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-['Space_Mono']">
        <div className="max-w-md w-full border-2 border-black p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-black mb-4">Profile Setup Issue</h2>
          <p className="text-sm text-gray-600 mb-6">
            We're having trouble setting up your profile. This might be a temporary issue.
          </p>
          <p className="text-xs text-gray-500 mb-6 font-mono bg-gray-50 p-3 border border-gray-200">
            {error.message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => { window.location.href = '/feedback' }}
              className="px-6 py-3 bg-white text-black border-2 border-black hover:bg-gray-50 transition-colors"
            >
              Report Issue
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Profile is ready - render children
  return <>{children}</>
}
