/**
 * Message View Component
 * Chat interface for direct messages
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Message {
  id: string
  sender_id: string
  sender_username: string
  sender_avatar_url: string | null
  content: string
  message_type: string
  attachment_url: string | null
  created_at: string
  is_deleted: boolean
  read_by: string[]
}

interface MessageViewProps {
  conversationId: string
  otherUserId: string
  otherUsername: string
}

export function MessageView({ conversationId, otherUserId, otherUsername }: MessageViewProps) {
  const { user, isAuthenticated } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isAuthenticated && conversationId) {
      loadMessages()
      markAsRead()
      
      // Set up realtime subscription
      const channel = supabase
        .channel(`conversation-${conversationId}`)
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message])
            markAsRead()
            scrollToBottom()
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isAuthenticated, conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        conversation_id_param: conversationId,
        limit_param: 100,
        offset_param: 0
      })
      
      if (error) throw error
      // Reverse to show oldest first
      setMessages((data || []).reverse())
    } catch (error) {
      console.error('Failed to load messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async () => {
    try {
      await supabase.rpc('mark_messages_read', {
        conversation_id_param: conversationId
      })
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim()) return
    
    try {
      setSending(true)
      const { data, error } = await supabase.rpc('send_message', {
        conversation_id_param: conversationId,
        content_param: newMessage.trim(),
        message_type_param: 'text',
        attachment_url_param: null
      })
      
      if (error) throw error
      
      if (data.success) {
        setNewMessage('')
        inputRef.current?.focus()
        // Message will be added via realtime subscription
      } else {
        toast.error(data.error || 'Failed to send message')
      }
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error(error.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getTimeDisplay = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
  }

  if (!isAuthenticated) return null

  return (
    <div className="font-['Space_Mono'] h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b-2 border-black flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
          {otherUsername?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1">
          <Link href={`/profile/${otherUsername}`} className="font-bold text-black hover:underline">
            {otherUsername}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>Start the conversation!</p>
          </div>
        )}

        {!loading && messages.map((message) => {
          const isOwnMessage = message.sender_id === user?.id || message.sender_username === user?.name
          
          return (
            <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                <div className={`p-3 border-2 ${
                  isOwnMessage 
                    ? 'bg-black text-white border-black' 
                    : 'bg-white text-black border-gray-300'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 px-1">
                  {getTimeDisplay(message.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-black">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
            placeholder={`Message ${otherUsername}...`}
            className="flex-1 p-3 border-2 border-gray-300 resize-none font-['Space_Mono'] text-sm focus:border-black focus:outline-none"
            rows={2}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
      </div>
    </div>
  )
}
