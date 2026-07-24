/**
 * Conversation List Component
 * Display list of user's conversations with unread counts
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'

interface Conversation {
  conversation_id: string
  other_user_id: string
  other_user_username: string
  other_user_avatar_url: string | null
  other_user_full_name: string | null
  last_message_preview: string | null
  last_message_at: string
  unread_count: number
}

/** Shape returned by get_user_conversations_ext. */
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

interface ConversationListProps {
  selectedConversationId?: string | null
  onSelectConversation: (conversationId: string, userId: string, username: string) => void
}

export function ConversationList({ selectedConversationId, onSelectConversation }: ConversationListProps) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      loadConversations()
      
      // Set up realtime subscription for new messages
      const channel = supabase
        .channel('conversations-updates')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            loadConversations()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isAuthenticated])

  const loadConversations = async () => {
    try {
      setLoading(true)
      // get_user_conversations resolves the caller with auth.uid(), which is
      // always NULL under NextAuth, so it returned nothing. The _ext variant
      // takes the caller from the session via /api/rpc.
      const { data, error } = await callRpc<ConversationRow[]>(
        'get_user_conversations_ext',
        { page_size: 50, page_offset: 0 }
      )

      if (error) throw new Error(error.message)

      // The RPC columns are other_username / other_avatar_url / other_full_name.
      setConversations(
        (data || []).map((row) => ({
          conversation_id: row.conversation_id,
          other_user_id: row.other_user_id,
          other_user_username: row.other_username,
          other_user_avatar_url: row.other_avatar_url,
          other_user_full_name: row.other_full_name,
          last_message_preview: row.last_message_preview,
          last_message_at: row.last_message_at,
          unread_count: Number(row.unread_count ?? 0),
        }))
      )
    } catch (error: any) {
      console.error('Failed to load conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  if (!isAuthenticated) return null

  return (
    <div className="font-['Space_Mono'] h-full flex flex-col">
      <div className="p-4 border-b-2 border-black">
        <h2 className="text-xl font-bold">Messages</h2>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && conversations.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-gray-600 mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">
              Start a conversation by visiting an artist&apos;s profile and clicking &ldquo;Message&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {!loading && conversations.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.conversation_id}
              onClick={() => onSelectConversation(conv.conversation_id, conv.other_user_id, conv.other_user_username)}
              className={`w-full p-4 border-b-2 border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                selectedConversationId === conv.conversation_id ? 'bg-gray-100' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 flex-shrink-0">
                  {conv.other_user_username?.[0]?.toUpperCase() || '?'}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-bold text-black truncate">{conv.other_user_username}</span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{getTimeAgo(conv.last_message_at)}</span>
                  </div>
                  
                  {conv.last_message_preview && (
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-black' : 'text-gray-600'}`}>
                      {conv.last_message_preview}
                    </p>
                  )}
                  
                  {conv.unread_count > 0 && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-0.5 bg-black text-white text-xs font-bold">
                        {conv.unread_count} new
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
