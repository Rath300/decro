/**
 * Messages / DM Page
 * Full direct messaging interface with real-time updates
 */

'use client'

import { useAuth } from '@/context/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ConversationList } from '@/components/messages/ConversationList'
import { MessageView } from '@/components/messages/MessageView'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'

export default function MessagesPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string
    userId: string
    username: string
  } | null>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  // Handle URL params (conversation ID or user ID to start new conversation)
  useEffect(() => {
    if (!isAuthenticated) return

    const conversationId = searchParams.get('conversation')
    const userId = searchParams.get('user')

    if (conversationId) {
      // Load conversation details
      loadConversationDetails(conversationId)
    } else if (userId) {
      // Start new conversation with user
      startNewConversation(userId)
    }
  }, [isAuthenticated, searchParams])

  const loadConversationDetails = async (conversationId: string) => {
    try {
      // Get conversation participants to find other user
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles(username)')
        .eq('conversation_id', conversationId)

      if (participants && participants.length === 2) {
        // Find the other user
        const { data: currentUserProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user?.id)
          .maybeSingle()

        if (currentUserProfile) {
          const otherParticipant = participants.find(p => p.user_id !== currentUserProfile.id)
          if (otherParticipant) {
            setSelectedConversation({
              id: conversationId,
              userId: otherParticipant.user_id,
              username: (otherParticipant.profiles as any)?.username || 'User'
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to load conversation details:', error)
    }
  }

  const startNewConversation = async (userId: string) => {
    try {
      const { data: conversationId, error } = await callRpc<string>(
        'get_or_create_conversation_with_profile_ext',
        { other_profile_id_param: userId }
      )

      if (error) throw new Error(error.message)
      if (!conversationId) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()

      setSelectedConversation({
        id: conversationId,
        userId: userId,
        username: profile?.username || 'User'
      })

      router.replace(`/messages?conversation=${conversationId}`)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  const handleSelectConversation = (conversationId: string, userId: string, username: string) => {
    setSelectedConversation({ id: conversationId, userId, username })
    router.replace(`/messages?conversation=${conversationId}`)
  }

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
    <div className="h-screen bg-white font-['Space_Mono'] flex flex-col">
      {/* Main content - split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List - Left Panel */}
        <div className="w-full md:w-1/3 border-r-2 border-black overflow-hidden">
          <ConversationList
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Message View - Right Panel */}
        <div className="hidden md:block md:w-2/3">
          {selectedConversation ? (
            <MessageView
              conversationId={selectedConversation.id}
              otherUserId={selectedConversation.userId}
              otherUsername={selectedConversation.username}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

