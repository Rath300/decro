import { useState, useEffect } from 'react'
import db from '@/lib/db'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'

export interface UserHistoryItem {
  id?: number
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
        const allHistory: any[] = await db.userHistory
          .where('userId')
          .equals(user.id)
          .toArray()

        const recentHistory: UserHistoryItem[] = allHistory
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
          .slice(0, 50)

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
            .rpc('get_user_liked_posts_ext', { external_id_param: user.id })
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
        const likedPosts = (likesResult.data as any[] | undefined)?.map((like: any) => ({
          title: like?.title ?? `Post ${like?.post_id}`,
          link: `/feed#${like?.post_id}`
        })) || []

        setPersonalizedData({
          recentSubgroups,
          recentPosts,
          likedPosts
        })
      } catch (error) {
        console.warn('Failed to load user history:', error)
        
        // Keep empty sections on error
        setPersonalizedData({ recentSubgroups: [], recentPosts: [], likedPosts: [] })
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
