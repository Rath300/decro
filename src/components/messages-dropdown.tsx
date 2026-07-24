'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { callRpc } from '@/lib/rpc'

// This showed a "Direct messaging coming soon!" card even though /messages was
// fully built and linked from the profile page. Messaging itself was broken for a
// different reason — the RPCs resolved the caller with auth.uid() — so the
// dropdown now lists real threads and surfaces the unread count.

interface ConversationRow {
  conversation_id: string
  other_user_id: string
  other_username: string
  other_full_name: string | null
  other_avatar_url: string | null
  last_message_at: string
  last_message_preview: string | null
  unread_count: number | string
}

function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(value).toLocaleDateString()
}

export function MessagesDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await callRpc<ConversationRow[]>(
      'get_user_conversations_ext',
      { page_size: 8, page_offset: 0 }
    )
    if (error) {
      console.error('Failed to load conversations:', error.message)
    } else {
      setConversations(data || [])
    }
    setLoading(false)
  }, [])

  // Load once for the badge, then again whenever the panel is opened.
  useEffect(() => {
    if (isAuthenticated) load()
  }, [isAuthenticated, load])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  if (!isAuthenticated) {
    return null
  }

  const unreadTotal = conversations.reduce(
    (sum, c) => sum + Number(c.unread_count ?? 0),
    0
  )

  const openConversation = (conversationId: string) => {
    setIsOpen(false)
    router.push(`/messages?conversation=${conversationId}`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
        aria-label={unreadTotal > 0 ? `Messages, ${unreadTotal} unread` : 'Messages'}
      >
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

        {unreadTotal > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 mt-2 w-80 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg font-['Space_Mono']">Messages</h3>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/messages')
                  }}
                  className="text-xs text-gray-600 hover:text-black font-['Space_Mono'] underline"
                >
                  See all
                </button>
              </div>

              {loading && conversations.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-600 font-['Space_Mono']">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-600 mb-4 font-['Space_Mono']">
                    No conversations yet. Start one from someone&apos;s profile.
                  </p>
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/messages')
                    }}
                    className="px-4 py-2 bg-black text-white border border-black hover:bg-gray-800 transition-colors text-sm font-['Space_Mono']"
                  >
                    Open Messages
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200 -mx-1">
                  {conversations.map((conversation) => {
                    const unread = Number(conversation.unread_count ?? 0)
                    return (
                      <li key={conversation.conversation_id}>
                        <button
                          onClick={() => openConversation(conversation.conversation_id)}
                          className="w-full text-left px-1 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                              className={`text-sm font-['Space_Mono'] truncate ${
                                unread > 0 ? 'font-bold text-black' : 'text-black'
                              }`}
                            >
                              {conversation.other_username}
                            </span>
                            <span className="text-[10px] text-gray-500 shrink-0">
                              {timeAgo(conversation.last_message_at)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-xs text-gray-600 truncate">
                              {conversation.last_message_preview || 'No messages yet'}
                            </span>
                            {unread > 0 && (
                              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-black text-white">
                                {unread}
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
