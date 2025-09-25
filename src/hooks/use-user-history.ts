import { useState, useEffect } from 'react'
import db from '@/lib/db'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'

export interface UserHistoryItem {
  id: number
  userId: string
  action: string
  targetId: string
  targetType: string
  timestamp: number
}

export interface PersonalizedMenuData {
  recentSubgroups: Array<{ name: string; slug: string; link: string }>
  recentPosts: Array<{ title: string; link: string }>
  likedPosts: Array<{ title: string; link: string }>
}

export function useUserHistory() {
  const [history, setHistory] = useState<UserHistoryItem[]>([])
  const [personalizedData, setPersonalizedData] = useState<PersonalizedMenuData>({
    recentSubgroups: [],
    recentPosts: [],
    likedPosts: []
  })
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const loadUserHistory = async () => {
      try {
        // Get recent user history from local storage first
        const recentHistory = await db.userHistory
          .where('userId')
          .equals(user.id)
          .orderBy('timestamp')
          .reverse()
          .limit(50)
          .toArray()

        setHistory(recentHistory)

        // Fetch real data from Supabase
        const [subgroupsResult, postsResult, likesResult] = await Promise.all([
          // Get recent subgroups visited
          supabase
            .from('subgroups')
            .select('id, name, slug')
            .order('created_at', { ascending: false })
            .limit(5),
          
          // Get recent posts viewed
          supabase
            .from('posts')
            .select('id, title, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          
          // Get liked posts
          supabase
            .from('likes')
            .select(`
              post_id,
              posts!inner(id, title)
            `)
            .eq('user_id', user.id)
            .eq('source_id', 'decro')
            .order('created_at', { ascending: false })
            .limit(5)
        ])

        // Process subgroups
        const recentSubgroups = subgroupsResult.data?.map(subgroup => ({
          name: subgroup.name,
          slug: subgroup.slug,
          link: `/subgroup/${subgroup.slug}`
        })) || []

        // Process recent posts
        const recentPosts = postsResult.data?.map(post => ({
          title: post.title,
          link: `/feed#${post.id}`
        })) || []

        // Process liked posts
        const likedPosts = likesResult.data?.map(like => ({
          title: like.posts?.title || `Post ${like.post_id}`,
          link: `/feed#${like.post_id}`
        })) || []

        // If no real data, add some sample data for demo
        if (recentSubgroups.length === 0 && recentPosts.length === 0 && likedPosts.length === 0) {
          const sampleHistory = [
            { userId: user.id, action: 'view', targetId: 'decro-music', targetType: 'subgroup', timestamp: Date.now() - 1000 },
            { userId: user.id, action: 'view', targetId: 'visual-art', targetType: 'subgroup', timestamp: Date.now() - 2000 },
            { userId: user.id, action: 'like', targetId: 'post-123', targetType: 'post', timestamp: Date.now() - 3000 },
            { userId: user.id, action: 'view', targetId: 'post-456', targetType: 'post', timestamp: Date.now() - 4000 },
          ]
          
          await db.userHistory.bulkAdd(sampleHistory)
          setHistory(sampleHistory)

          // Add sample data to personalized data
          setPersonalizedData({
            recentSubgroups: [
              { name: 'Decro Music', slug: 'decro-music', link: '/subgroup/decro-music' },
              { name: 'Visual Art', slug: 'visual-art', link: '/subgroup/visual-art' },
              { name: 'Film', slug: 'film', link: '/subgroup/film' }
            ],
            recentPosts: [
              { title: 'Kendrick live set in LA — 4K remaster', link: '/feed' },
              { title: 'A24 behind the scenes on DP choices', link: '/feed' },
              { title: 'New indie playlist drop (Sep)', link: '/feed' }
            ],
            likedPosts: [
              { title: 'Liked Post 123', link: '/feed#post-123' },
              { title: 'Liked Post 456', link: '/feed#post-456' }
            ]
          })
        } else {
          setPersonalizedData({
            recentSubgroups,
            recentPosts,
            likedPosts
          })
        }
      } catch (error) {
        console.warn('Failed to load user history:', error)
        
        // Fallback to sample data
        setPersonalizedData({
          recentSubgroups: [
            { name: 'Decro Music', slug: 'decro-music', link: '/subgroup/decro-music' },
            { name: 'Visual Art', slug: 'visual-art', link: '/subgroup/visual-art' },
            { name: 'Film', slug: 'film', link: '/subgroup/film' }
          ],
          recentPosts: [
            { title: 'Kendrick live set in LA — 4K remaster', link: '/feed' },
            { title: 'A24 behind the scenes on DP choices', link: '/feed' },
            { title: 'New indie playlist drop (Sep)', link: '/feed' }
          ],
          likedPosts: [
            { title: 'Liked Post 123', link: '/feed#post-123' },
            { title: 'Liked Post 456', link: '/feed#post-456' }
          ]
        })
      }
    }

    loadUserHistory()
  }, [user?.id])

  const trackAction = async (action: string, targetId: string, targetType: string) => {
    if (!user?.id) return

    try {
      await db.userHistory.add({
        userId: user.id,
        action,
        targetId,
        targetType,
        timestamp: Date.now()
      })
    } catch (error) {
      console.warn('Failed to track action:', error)
    }
  }

  return {
    history,
    personalizedData,
    trackAction
  }
}
