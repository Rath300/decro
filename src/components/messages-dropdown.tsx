'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export function MessagesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Messages"
      >
        {/* Message icon (envelope) */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 text-black" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
          />
        </svg>
        
        {/* Badge for unread messages (placeholder for future implementation) */}
        {/* <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          0
        </span> */}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg font-['Space_Mono']">Messages</h3>
              </div>

              {/* Coming Soon Message */}
              <div className="py-8 text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-gray-600 mb-4">
                  Direct messaging coming soon!
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/messages')
                  }}
                  className="px-4 py-2 bg-black text-white border border-black hover:bg-gray-800 transition-colors text-sm font-['Space_Mono']"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
