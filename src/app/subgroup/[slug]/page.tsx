"use client"

import { useParams } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import CardGrid from '@/components/card-grid'
import DetailModal from '@/components/detail-modal'
import { useEffect, useState } from 'react'
import supabase from '@/lib/supabase-client'
import { StaggeredMenu } from '@/components/StaggeredMenu'
import Identity from '@/components/Identity'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'

export default function SubgroupDetail() {
  const params = useParams() as { slug: string }
  const label = params.slug?.replace(/-/g, ' ')
  const { posts } = usePosts()
  const { user } = useAuth()
  const toast = useToast()
  const [subgroupId, setSubgroupId] = useState<string | null>(null)
  const [subgroupData, setSubgroupData] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subgroups')
        .select('id, name, description')
        .eq('slug', params.slug)
        .single()
      
      if (data) {
        setSubgroupId(data.id)
        setSubgroupData(data)

        // Get follower count
        const { count } = await supabase
          .from('subgroup_follows')
          .select('*', { count: 'exact', head: true })
          .eq('subgroup_id', data.id)
        
        setFollowerCount(count || 0)

        // Check if user is following
        if (user?.id) {
          const { data: followData } = await supabase.rpc('is_following_subgroup', {
            target_subgroup_id: data.id
          })
          setIsFollowing(followData || false)
        }
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
      const { data, error } = await supabase.rpc('toggle_follow_subgroup', {
        target_subgroup_id: subgroupId
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

  const cards: MediaCard[] = subgroupId ? posts.filter(p => p.subgroupId === subgroupId) : []

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-2">{subgroupData?.name || label}</h1>
            {subgroupData?.description && (
              <p className="text-sm text-gray-600 mb-2">{subgroupData.description}</p>
            )}
            <p className="text-sm text-gray-500">{followerCount} followers · {cards.length} posts</p>
          </div>
          <button
            onClick={handleFollow}
            disabled={followLoading || !user}
            className={`px-4 py-2 border-2 transition-colors text-sm ${
              isFollowing
                ? 'border-gray-300 hover:border-red-500 hover:text-red-500'
                : 'border-black bg-black text-white hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
        {cards.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black font-['Space_Mono']">No posts yet in this subgroup.</p>
          </div>
        ) : (
          <CardGrid cards={cards} />
        )}
        <DetailModal />
      </main>
    </div>
  )
}


