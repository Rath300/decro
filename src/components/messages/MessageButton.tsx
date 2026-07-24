/**
 * Message Button Component
 * Quick action button to start a DM with a user
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'

interface MessageButtonProps {
  targetUserId: string // UUID of the user to message
  currentUserProfileId: string | null // UUID of current user's profile
  className?: string
}

export function MessageButton({ targetUserId, currentUserProfileId, className = '' }: MessageButtonProps) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const handleStartConversation = async () => {
    if (!isAuthenticated || !currentUserProfileId) {
      toast.error('Please sign in to send messages')
      return
    }

    try {
      setLoading(true)

      // Returns the conversation id directly, not a { success } envelope.
      const { data: conversationId, error } = await callRpc<string>(
        'get_or_create_conversation_with_profile_ext',
        { other_profile_id_param: targetUserId }
      )

      if (error) throw new Error(error.message)
      if (!conversationId) throw new Error('Failed to start conversation')

      router.push(`/messages?conversation=${conversationId}`)
    } catch (error: any) {
      console.error('Failed to start conversation:', error)
      toast.error(error.message || 'Failed to start conversation')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return null

  return (
    <button
      onClick={handleStartConversation}
      disabled={loading}
      className={`px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-['Space_Mono'] disabled:opacity-50 ${className}`}
    >
      {loading ? 'Opening...' : 'Message'}
    </button>
  )
}
