/**
 * Notifications Dropdown
 * Displays user notifications in a dropdown
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Navigate to relevant page based on notification type and post content
    if (notification.post_id) {
      try {
        // Check if the post is a text post to redirect to the dedicated post page
        const { data: postData } = await supabase
          .from('posts')
          .select('content_type')
          .eq('id', notification.post_id)
          .single()

        if (postData?.content_type === 'text') {
          router.push(`/post/${notification.post_id}`)
        } else {
          router.push(`/feed#${notification.post_id}`)
        }
      } catch (error) {
        // Fallback to feed page if error
        router.push(`/feed#${notification.post_id}`)
      }
    } else if (notification.type === 'follow' || notification.type === 'profile_view') {
      // Navigate to profile if it's a follow or profile view notification
      if (notification.actor_username) {
        router.push(`/profile/${notification.actor_username}`)
      }
    } else if (notification.type === 'spotlight' && notification.spotlight_id) {
      // Navigate to spotlight page if it's a spotlight notification
      router.push(`/spotlight`)
    }

    setIsOpen(false)
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6 text-black"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border-2 border-black shadow-lg z-50 max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h3 className="font-['Space_Mono'] font-bold text-black">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:underline font-['Space_Mono']"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-gray-500 font-['Space_Mono'] text-sm">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-['Space_Mono'] text-sm">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {notification.type === 'like' && <span className="text-xl">❤️</span>}
                        {notification.type === 'comment' && <span className="text-xl">💬</span>}
                        {notification.type === 'reply' && <span className="text-xl">↩️</span>}
                        {notification.type === 'comment_like' && <span className="text-xl">💝</span>}
                        {notification.type === 'follow' && <span className="text-xl">👤</span>}
                        {notification.type === 'spotlight' && <span className="text-xl">⭐</span>}
                        {notification.type === 'profile_view' && <span className="text-xl">👁️</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-['Space_Mono'] text-sm text-black">
                          {notification.message}
                        </p>
                        <p className="font-['Space_Mono'] text-xs text-gray-500 mt-1">
                          {getTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


