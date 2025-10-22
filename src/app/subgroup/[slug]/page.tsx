"use client"

import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useUserHistory } from '@/hooks/use-user-history'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const label = params.slug?.replace(/-/g, ' ')
  const { posts } = usePosts()
  const { user } = useAuth()
  const toast = useToast()
  const { trackAction } = useUserHistory()
  const [subgroupId, setSubgroupId] = useState<string | null>(null)
  const [subgroupData, setSubgroupData] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [isModerator, setIsModerator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState<'new' | 'hot' | 'top'>('new')

  useEffect(() => {
    (async () => {
      try {
        // Load subgroup data with more details
        const { data } = await supabase
          .from('subgroups')
          .select(`
            id, 
            name, 
            description, 
            slug,
            cover_image_url,
            created_by,
            created_at,
            member_count,
            post_count
          `)
          .eq('slug', params.slug)
          .single()
        
        if (data) {
          setSubgroupId(data.id)
          
          // Get creator username separately
          let creator_username = null;
          if (data.created_by) {
            try {
              const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('external_id', data.created_by)
                .maybeSingle(); // Use maybeSingle() to avoid 406 errors
              
              if (!profileError && profileData) {
                creator_username = profileData.username;
              } else {
                creator_username = data.created_by; // Use external_id as fallback
              }
            } catch (e) {
              console.warn('Could not fetch username for:', data.created_by, e);
              creator_username = data.created_by; // Use external_id as fallback
            }
          }
          
          // Transform data to include creator username
          const transformedData = {
            ...data,
            creator_username
          }
          setSubgroupData(transformedData)

          // Track subgroup visit
          if (user?.id) {
            trackAction('view', params.slug, 'subgroup')
          }

          // Get follower count
          const { count } = await supabase
            .from('subgroup_follows')
            .select('*', { count: 'exact', head: true })
            .eq('subgroup_id', data.id)
          
          setFollowerCount(count || 0)

          // Check if user is following and if they're a moderator
          if (user?.id) {
            const [followResult, moderatorResult] = await Promise.all([
              supabase.rpc('is_following_subgroup_ext', {
                target_subgroup_id: data.id,
                external_id_param: user.id
              }),
              supabase.rpc('is_subgroup_moderator_ext', {
                subgroup_id_param: data.id,
                external_id_param: user.id
              })
            ])
            
            setIsFollowing(followResult.data || false)
            setIsModerator(moderatorResult.data || false)
          }
        }
      } catch (error) {
        console.error('Failed to load subgroup:', error)
      } finally {
        setLoading(false)
      }
    })()
  }, [params.slug, user?.id])

  const handleFollow = async () => {
    if (!user?.id) {
      toast.error('Please sign in to follow subgroups')
      return
    }

    if (!subgroupId) return

    setFollowLoading(true)

    try {
      const { data, error } = await supabase.rpc('toggle_follow_subgroup_ext', {
        target_subgroup_id: subgroupId,
        external_id_param: user.id
      })

      if (error) throw error

      setIsFollowing(data.following)
      setFollowerCount(prev => data.following ? prev + 1 : prev - 1)
      toast.success(data.following ? 'Following subgroup!' : 'Unfollowed subgroup')
    } catch (error: any) {
      console.error('Follow toggle failed:', error)
      toast.error(error.message || 'Failed to follow subgroup')
    } finally {
      setFollowLoading(false)
    }
  }

  // Sort cards based on current sort mode
  const getSortedCards = (cards: MediaCard[]) => {
    switch (sortMode) {
      case 'hot':
        return [...cards].sort((a, b) => b.views - a.views)
      case 'top':
        // For now, use views as the primary metric since we don't have likes count in MediaCard
        return [...cards].sort((a, b) => b.views - a.views)
      default:
        return [...cards].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  }

  const cards: MediaCard[] = subgroupId ? getSortedCards(posts.filter(p => p.subgroupId === subgroupId)) : []

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-gray-500">Loading subgroup...</div>
      </div>
    )
  }

  if (!subgroupData) {
    return (
      <div className="min-h-screen bg-white font-['Space_Mono'] flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">Subgroup not found</div>
          <Link href="/subgroup" className="text-black hover:underline">
            ← Browse Subgroups
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          {/* Subgroup Banner */}
          <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
            {subgroupData.cover_image_url ? (
              <img
                src={subgroupData.cover_image_url}
                alt={subgroupData.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200">
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">d/{subgroupData.slug}</h1>
                  {subgroupData.description && (
                    <p className="text-sm text-gray-300 mt-2">{subgroupData.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-300">
                    {followerCount} members
                  </div>
                  <div className="text-xs text-gray-400">
                    {subgroupData.creator_username && (
                      <div className="mb-1">Created by u/{subgroupData.creator_username}</div>
                    )}
                    Created {getTimeAgo(subgroupData.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href={`/create?subgroup=${encodeURIComponent(subgroupData.id)}`}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Create Post
              </Link>
              <button
                onClick={handleFollow}
                disabled={followLoading || !user}
                className={`px-6 py-2 border-2 transition-colors text-sm font-medium ${
                  isFollowing
                    ? 'border-gray-300 text-black hover:border-red-500 hover:text-red-500'
                    : 'border-black bg-black text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? '...' : isFollowing ? 'Joined' : 'Join'}
              </button>
              {isModerator && (
                <Link
                  href={`/subgroup/${params.slug}/mod`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  Mod Tools
                </Link>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort:</span>
              {(['new', 'hot', 'top'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`px-3 py-1 text-sm transition-colors ${
                    sortMode === mode
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts */}
        {cards.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-medium mb-2">No posts yet</h3>
              <p className="text-sm">Be the first to share something in this subgroup!</p>
            </div>
            <Link
              href={`/create?subgroup=${encodeURIComponent(subgroupId || '')}`}
              className="inline-block px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors text-sm"
            >
              Create Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <CardGrid cards={cards} />
          </div>
        )}
        
        <DetailModal />
      </main>
    </div>
  )
}


