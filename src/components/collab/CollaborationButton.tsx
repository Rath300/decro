/**
 * Connect button — friend-request style.
 *
 * Backed by the existing collaboration_requests tables/RPCs; the UI is Connect
 * rather than Collaborate so profiles expose one relationship action.
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'

interface CollaborationButtonProps {
  targetUserId: string // UUID of the profile being viewed
  targetUsername: string
  currentUserProfileId: string | null // UUID of current user's profile
}

interface ConnectStatus {
  status: 'none' | 'collaborating' | 'request_sent' | 'request_received'
  can_send_request: boolean
  request_id?: string
}

export function CollaborationButton({
  targetUserId,
  targetUsername,
  currentUserProfileId,
}: CollaborationButtonProps) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !targetUserId || !currentUserProfileId) return
    loadStatus()
  }, [isAuthenticated, targetUserId, currentUserProfileId])

  const loadStatus = async () => {
    if (!currentUserProfileId) return

    try {
      setLoading(true)
      const { data, error } = await callRpc<ConnectStatus>('check_collaboration_status', {
        other_user_id: targetUserId,
      })

      if (error) throw new Error(error.message)
      setStatus(data)
    } catch (error) {
      console.error('Failed to load connection status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendRequest = async () => {
    if (!isAuthenticated || !currentUserProfileId) {
      toast.error('Please sign in to connect')
      return
    }

    try {
      setActionLoading(true)
      const { data, error } = await callRpc<any>('send_collaboration_request', {
        receiver_profile_id: targetUserId,
        message_text: requestMessage || null,
        collab_type: 'general',
      })

      if (error) throw new Error(error.message)

      if (data?.success) {
        toast.success('Connection request sent!')
        setShowMessageModal(false)
        setRequestMessage('')
        await loadStatus()
      } else {
        toast.error(data?.error || 'Failed to send request')
      }
    } catch (error: any) {
      console.error('Failed to send connection request:', error)
      toast.error(error.message || 'Failed to send request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!status?.request_id) return

    try {
      setActionLoading(true)
      const { data, error } = await callRpc<any>('respond_to_collaboration_request_ext', {
        request_id: status.request_id,
        response: 'accepted',
      })

      if (error) throw new Error(error.message)

      if (data?.success) {
        toast.success('Connected!')
        await loadStatus()
      } else {
        toast.error(data?.error || 'Failed to accept request')
      }
    } catch (error: any) {
      console.error('Failed to accept request:', error)
      toast.error(error.message || 'Failed to accept request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineRequest = async () => {
    if (!status?.request_id) return

    try {
      setActionLoading(true)
      const { data, error } = await callRpc<any>('respond_to_collaboration_request_ext', {
        request_id: status.request_id,
        response: 'declined',
      })

      if (error) throw new Error(error.message)

      if (data?.success) {
        toast.info('Request declined')
        await loadStatus()
      } else {
        toast.error(data?.error || 'Failed to decline request')
      }
    } catch (error: any) {
      console.error('Failed to decline request:', error)
      toast.error(error.message || 'Failed to decline request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelRequest = async () => {
    if (!status?.request_id) return

    try {
      setActionLoading(true)
      const { data, error } = await callRpc<any>('cancel_collaboration_request_ext', {
        request_id: status.request_id,
      })

      if (error) throw new Error(error.message)

      if (data?.success) {
        toast.info('Request cancelled')
        await loadStatus()
      } else {
        toast.error(data?.error || 'Failed to cancel request')
      }
    } catch (error: any) {
      console.error('Failed to cancel request:', error)
      toast.error(error.message || 'Failed to cancel request')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isAuthenticated) return null
  if (loading) {
    return (
      <button
        disabled
        className="px-4 py-2 border-2 border-gray-300 text-gray-400 cursor-not-allowed text-sm"
      >
        ...
      </button>
    )
  }

  if (!status) return null

  if (status.status === 'collaborating') {
    return (
      <button
        disabled
        className="px-4 py-2 border-2 border-blue-600 bg-blue-600 text-white text-sm"
      >
        Connected
      </button>
    )
  }

  if (status.status === 'request_sent') {
    return (
      <button
        onClick={handleCancelRequest}
        disabled={actionLoading}
        className="px-4 py-2 border-2 border-yellow-500 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors text-sm disabled:opacity-50"
      >
        {actionLoading ? 'Cancelling...' : 'Request Pending'}
      </button>
    )
  }

  if (status.status === 'request_received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={actionLoading}
          className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors text-sm disabled:opacity-50"
        >
          {actionLoading ? '...' : 'Accept'}
        </button>
        <button
          onClick={handleDeclineRequest}
          disabled={actionLoading}
          className="px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowMessageModal(true)}
        disabled={actionLoading}
        className="px-4 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
      >
        Connect
      </button>

      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-black p-6 max-w-md w-full font-['Space_Mono']">
            <h3 className="text-xl font-bold mb-4">Connect with {targetUsername}</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a connection request. They&apos;ll need to accept before you&apos;re connected.
              Add an optional note:
            </p>

            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Hey — would love to connect..."
              className="w-full p-3 border-2 border-gray-300 resize-none font-['Space_Mono'] text-sm"
              rows={4}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Sending...' : 'Send Request'}
              </button>
              <button
                onClick={() => {
                  setShowMessageModal(false)
                  setRequestMessage('')
                }}
                disabled={actionLoading}
                className="px-4 py-2 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
