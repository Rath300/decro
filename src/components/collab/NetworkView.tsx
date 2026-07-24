/**
 * Network View Component
 * Display user's collaboration network (like LinkedIn connections)
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { callRpc } from '@/lib/rpc'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Collaborator {
  collaboration_id: string
  collaborator_id: string
  collaborator_username: string
  collaborator_avatar_url: string | null
  collaborator_full_name: string | null
  collaboration_type: string | null
  projects_count: number
  started_at: string
  last_interaction_at: string
}

export function NetworkView({ userId }: { userId?: string }) {
  const { isAuthenticated } = useAuth()
  const toast = useToast()
  const [network, setNetwork] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      loadNetwork()
    }
  }, [isAuthenticated, userId])

  const loadNetwork = async () => {
    try {
      setLoading(true)
      const { data, error } = await callRpc<Collaborator[]>('get_user_network', {
        user_profile_id: userId || null
      })
      
      if (error) throw error
      setNetwork(data || [])
    } catch (error) {
      console.error('Failed to load network:', error)
      toast.error('Failed to load network')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCollab = async (collabId: string) => {
    if (!confirm('Remove this connection? This action cannot be undone.')) return

    try {
      const { data, error } = await callRpc<any>('remove_collaboration_ext', {
        collaboration_id: collabId
      })
      
      if (error) throw error
      
      if (data.success) {
        toast.success('Connection removed')
        await loadNetwork()
      } else {
        toast.error(data.error || 'Failed to remove connection')
      }
    } catch (error: any) {
      console.error('Failed to remove connection:', error)
      toast.error(error.message || 'Failed to remove connection')
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
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
    return date.toLocaleDateString()
  }

  if (!isAuthenticated) return null

  return (
    <div className="font-['Space_Mono']">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Network</h2>
        <span className="text-sm text-gray-600">{network.length} Connection{network.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-black"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && network.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">🤝</div>
          <p className="text-gray-600 mb-2">No connections yet</p>
          <p className="text-sm text-gray-500">
            Send a connection request from someone&apos;s profile to start building your network
          </p>
        </div>
      )}

      {/* Network Grid */}
      {!loading && network.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {network.map((collab) => (
            <div key={collab.collaboration_id} className="border-2 border-gray-200 p-4 hover:border-black transition-colors">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Link href={`/profile/${collab.collaborator_username}`}>
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600 text-xl flex-shrink-0 hover:bg-gray-300 transition-colors cursor-pointer">
                    {collab.collaborator_username?.[0]?.toUpperCase() || '?'}
                  </div>
                </Link>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/profile/${collab.collaborator_username}`}
                    className="font-bold text-black hover:underline block truncate"
                  >
                    {collab.collaborator_username}
                  </Link>
                  
                  {collab.collaborator_full_name && (
                    <p className="text-sm text-gray-600 truncate">{collab.collaborator_full_name}</p>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span>Connected {getTimeAgo(collab.started_at)}</span>
                    {collab.projects_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{collab.projects_count} project{collab.projects_count !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                  
                  {collab.collaboration_type && collab.collaboration_type !== 'general' && (
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 border border-gray-300">
                      {collab.collaboration_type}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              {!userId && ( // Only show remove button on own profile
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <Link
                    href={`/messages?user=${collab.collaborator_id}`}
                    className="flex-1 px-3 py-2 text-center bg-black text-white border-2 border-black hover:bg-gray-800 transition-colors text-sm"
                  >
                    Message
                  </Link>
                  <Link
                    href={`/profile/${collab.collaborator_username}`}
                    className="flex-1 px-3 py-2 text-center border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={() => handleRemoveCollab(collab.collaboration_id)}
                    className="px-3 py-2 border-2 border-red-300 text-red-600 hover:bg-red-50 transition-colors text-sm"
                    title="Remove connection"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
