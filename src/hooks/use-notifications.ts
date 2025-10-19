'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import supabase from '@/lib/supabase-client'

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow' | 'spotlight' | 'mention' | 'reply' | 'comment_like' | 'profile_view'
  actor_id: string | null
  actor_username: string | null
  post_id: string | null
  comment_id: string | null
  spotlight_id: string | null
  message: string
  read: boolean
  created_at: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    const loadNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        setNotifications(data || [])
        setUnreadCount(data?.filter((n: any) => !n.read).length || 0)
      } catch (error) {
        // keep silent but avoid crash
        console.error('Failed to load notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification
          setNotifications(prev => [n, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification
          setNotifications(prev => prev.map(x => x.id === n.id ? (n as Notification) : x))
          if (n.read) setUnreadCount(prev => Math.max(0, prev - 1))
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [user?.id])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } as Notification : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead }
}


