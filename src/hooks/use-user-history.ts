import { useState, useEffect } from 'react'
import db from '@/lib/db'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'

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

        // Get user's actual recent activity from local history
        const recentSubgroupVisits = recentHistory
          .filter(item => item.targetType === 'subgroup' && item.action === 'view')
          .slice(0, 5)
          .map(item => ({
            name: item.targetId, // This is the slug
            slug: item.targetId,
            link: `/subgroup/${item.targetId}`
          }))

        const recentPostViews = recentHistory
          .filter(item => item.targetType === 'post' && item.action === 'view')
          .slice(0, 5)

        const likesResult = await callRpc<any[]>('get_user_liked_posts_ext')

        // Process recent posts by fetching their titles
        const recentPosts = []
        for (const historyItem of recentPostViews) {
          try {
            const { data: postData } = await supabase
              .from('posts')
              .select('id, title')
              .eq('id', historyItem.targetId)
              .single()
            
            if (postData) {
              recentPosts.push({
                title: postData.title,
                link: `/feed#${postData.id}`
              })
            }
          } catch (error) {
            console.warn('Failed to fetch post title for history item:', error)
          }
        }

        // Process subgroups by fetching their names
        const recentSubgroups = []
        for (const historyItem of recentSubgroupVisits) {
          try {
            const { data: subgroupData } = await supabase
              .from('subgroups')
              .select('id, name, slug')
              .eq('slug', historyItem.slug)
              .single()
            
            if (subgroupData) {
              recentSubgroups.push({
                name: subgroupData.name,
                slug: subgroupData.slug,
                link: `/subgroup/${subgroupData.slug}`
              })
            }
          } catch (error) {
            console.warn('Failed to fetch subgroup name for history item:', error)
          }
        }

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
