/**
 * Collaboration Requests Component
 * View and manage incoming/outgoing collaboration requests
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface CollabRequest {
  id: string
  sender_id: string
  sender_username: string
  sender_avatar_url: string | null
  receiver_id: string
  receiver_username: string
  status: string
  message: string | null
  collaboration_type: string | null
  created_at: string
}

export function CollaborationRequests() {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
  const [requests, setRequests] = useState<CollabRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      loadRequests()
    }
  }, [isAuthenticated, activeTab])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const { data, error } = await callRpc<CollabRequest[]>('get_collaboration_requests_ext', {
        request_type: activeTab
      })
      
      if (error) throw error
      setRequests(data || [])
    } catch (error) {
      console.error('Failed to load requests:', error)
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId: string) => {
    try {
      const { data, error } = await callRpc<any>('respond_to_collaboration_request_ext', {
        request_id: requestId,
        response: 'accepted'
      })
      
      if (error) throw error
      
      if (data.success) {
        toast.success('Connection request accepted!')
        await loadRequests()
      } else {
        toast.error(data.error || 'Failed to accept request')
      }
    } catch (error: any) {
      console.error('Failed to accept request:', error)
      toast.error(error.message || 'Failed to accept request')
    }
  }

  const handleDecline = async (requestId: string) => {
    try {
      const { data, error } = await callRpc<any>('respond_to_collaboration_request_ext', {
        request_id: requestId,
        response: 'declined'
      })
      
      if (error) throw error
      
      if (data.success) {
        toast.info('Request declined')
        await loadRequests()
      } else {
        toast.error(data.error || 'Failed to decline request')
      }
    } catch (error: any) {
      console.error('Failed to decline request:', error)
      toast.error(error.message || 'Failed to decline request')
    }
  }

  const handleCancel = async (requestId: string) => {
    try {
      const { data, error } = await callRpc<any>('cancel_collaboration_request_ext', {
        request_id: requestId
      })
      
      if (error) throw error
      
      if (data.success) {
        toast.info('Request cancelled')
        await loadRequests()
      } else {
        toast.error(data.error || 'Failed to cancel request')
      }
    } catch (error: any) {
      console.error('Failed to cancel request:', error)
      toast.error(error.message || 'Failed to cancel request')
    }
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

  if (!isAuthenticated) return null

  return (
    <div className="font-['Space_Mono']">
      <h2 className="text-2xl font-bold mb-6">Connection Requests</h2>
      
      {/* Tabs */}
      <div className="border-b-2 border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === 'received'
                ? 'border-black font-bold text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-3 px-4 border-b-2 transition-colors ${
              activeTab === 'sent'
                ? 'border-black font-bold text-black'
                : 'border-transparent text-gray-500 hover:text-black'
            }`}
          >
            Sent
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && requests.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300">
          <p className="text-gray-600">
            {activeTab === 'received' 
              ? 'No connection requests received yet' 
              : 'No connection requests sent yet'}
          </p>
        </div>
      )}

      {/* Requests List */}
      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border-2 border-gray-200 p-4 hover:border-black transition-colors">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Link href={`/profile/${activeTab === 'received' ? request.sender_username : request.receiver_username}`}>
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 flex-shrink-0 hover:bg-gray-300 transition-colors cursor-pointer">
                    {(activeTab === 'received' ? request.sender_username : request.receiver_username)?.[0]?.toUpperCase() || '?'}
                  </div>
                </Link>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <Link 
                        href={`/profile/${activeTab === 'received' ? request.sender_username : request.receiver_username}`}
                        className="font-bold text-black hover:underline"
                      >
                        {activeTab === 'received' ? request.sender_username : request.receiver_username}
                      </Link>
                      <p className="text-xs text-gray-500">{getTimeAgo(request.created_at)}</p>
                    </div>
                    
                    {/* Status Badge */}
                    <span className={`text-xs px-2 py-1 border ${
                      request.status === 'pending' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
                      request.status === 'accepted' ? 'border-green-500 text-green-700 bg-green-50' :
                      'border-gray-500 text-gray-700 bg-gray-50'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  
                  {/* Message */}
                  {request.message && (
                    <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                      &ldquo;{request.message}&rdquo;
                    </p>
                  )}
                  
                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      {activeTab === 'received' ? (
                        <>
                          <button
                            onClick={() => handleAccept(request.id)}
                            className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors text-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(request.id)}
                            className="px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                        >
                          Cancel Request
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
