/**
 * Message Button Component
 * Quick action button to start a DM with a user
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase-client'
import { useToast } from '@/hooks/use-toast'

interface MessageButtonProps {
  targetUserId: string // UUID of the user to message
  className?: string
}

export function MessageButton({ targetUserId, className = '' }: MessageButtonProps) {
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)

  const handleStartConversation = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to send messages')
      return
    }

    try {
      setLoading(true)
      
      // Get or create conversation
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: targetUserId
      })
      
      if (error) throw error
      
      if (data.success) {
        // Navigate to messages page with conversation ID
        router.push(`/messages?conversation=${data.conversation_id}`)
      } else {
        toast.error(data.error || 'Failed to start conversation')
      }
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
