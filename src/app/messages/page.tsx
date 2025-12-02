/**
 * Messages / DM Page
 * Placeholder for external chat system integration
 */

'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MessagesPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-black mb-6">Messages</h1>
          
          <div className="border-2 border-black p-8 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-black mb-4">Direct Messages Coming Soon</h2>
            <p className="text-gray-600 mb-6">
              We're working on adding direct messaging to Decro. This feature will allow you to have private conversations with other creators.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 p-6 text-left mb-6">
              <h3 className="font-bold text-black mb-3">Planned Features:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-black">✓</span>
                  <span>Real-time messaging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black">✓</span>
                  <span>File and image sharing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black">✓</span>
                  <span>Read receipts and typing indicators</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black">✓</span>
                  <span>Message history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black">✓</span>
                  <span>Notification support</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 text-left text-sm">
              <p className="text-yellow-800">
                <strong>For Developers:</strong> To implement the DM system, integrate SendBird or Stream Chat. 
                See <code className="bg-yellow-100 px-1">IMPLEMENTATION_COMPLETE.md</code> for detailed setup instructions.
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              In the meantime, you can connect with other creators through comments and subgroups.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

