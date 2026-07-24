'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import supabase from '@/lib/supabase-client'
import { callRpc } from '@/lib/rpc'
import { useAuth } from '@/context/auth-context'
import db from '@/lib/db'

export interface MediaCard {
  id: string;
  type: 'music' | 'physical_art' | 'image' | 'edits' | 'video' | 'film' | 'graphic_design' | 'text';
  title: string;
  description?: string;
  imageUrl: string;
  aspectRatio: 'square' | 'portrait' | 'landscape';
  audioUrl?: string;
  videoUrl?: string;
  creator: string;
  date: string;
  isCurated?: boolean;
  views: number;
  subgroupId?: string;
  subgroupName?: string;
  subgroupSlug?: string;
  tags: string[];
}

interface PostContextType {
  // Post data
  posts: MediaCard[];
  setPosts: (posts: MediaCard[]) => void;
  
  // Like state
  likedCards: Set<string>;
  toggleLike: (cardId: string) => void;
  
  // Audio state
  playingAudio: string | null;
  setPlayingAudio: (audioId: string | null) => void;
  
  // Detail modal state
  selectedCard: MediaCard | null;
  setSelectedCard: (card: MediaCard | null) => void;
  showDetailModal: boolean;
  setShowDetailModal: (show: boolean) => void;
  
  // Comment state
  commentText: string;
  setCommentText: (text: string) => void;
  handleComment: () => void;
  
  // View tracking
  trackView: (postId: string) => void;
  // Refetch posts with server sort
  refetchPosts: (sortBy?: 'created_at' | 'likes' | 'comments') => Promise<void>;
  // Fair feed algorithm
  useFairFeed: boolean;
  setUseFairFeed: (use: boolean) => void;
  fetchFairFeed: () => Promise<void>;
  
  // User action tracking
  trackUserAction: (action: string, targetId: string, targetType: string) => void;
  trackSubgroupVisit: (subgroupSlug: string) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export function PostProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<MediaCard[]>([]);
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<MediaCard | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [useFairFeed, setUseFairFeed] = useState(false);
  const { user } = useAuth();

  const toggleLike = async (cardId: string) => {
    if (!user?.id) {
      console.warn('Cannot toggle like: user not authenticated')
      alert('Please sign in to like posts')
      return
    }
    
    console.log('=== TOGGLE LIKE DEBUG ===')
    console.log('Post ID:', cardId)
    console.log('User ID:', user.id)
    console.log('Currently liked:', likedCards.has(cardId))
    console.log('All liked cards:', Array.from(likedCards))
    
    // Optimistic update for instant UI response
    const isCurrentlyLiked = likedCards.has(cardId)
    setLikedCards(prev => {
      const next = new Set(prev)
      if (isCurrentlyLiked) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      console.log('Optimistic update applied:', isCurrentlyLiked ? 'unliked' : 'liked')
      return next
    })
    
    // Track user action
    try {
      await trackUserAction(isCurrentlyLiked ? 'unlike' : 'like', cardId, 'post')
    } catch (trackError) {
      console.warn('Failed to track user action:', trackError)
    }
    
    try {
      // Try to sync with server
      console.log('Calling toggle_like_ext RPC...')
      console.log('RPC params:', { post_id_param: cardId, external_id_param: user.id })
      
      // Add retry logic for new users
      let retries = 0
      let data = null
      let error = null
      
      while (retries < 3) {
        const result = await callRpc('toggle_like_ext', {
          post_id_param: cardId,
        })
        
        data = result.data
        error = result.error
        
        if (!error) break
        
        // If profile not found, wait and retry
        if (error.message?.includes('profile') || error.message?.includes('user')) {
          console.log(`Profile not ready, retry ${retries + 1}/3...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          retries++
        } else {
          break
        }
      }
      
      if (error) {
        console.error('toggle_like_ext failed:', error.message)
        throw new Error(error.message)
      }
      
      console.log('=== RPC SUCCESS ===')
      console.log('Response data:', data)
      
      // Verify the server state matches our optimistic update
      if (data && typeof data.liked === 'boolean') {
        console.log('Server returned liked state:', data.liked)
        console.log('Expected liked state:', !isCurrentlyLiked)
        
        if (data.liked !== !isCurrentlyLiked) {
          console.warn('⚠️ SERVER STATE MISMATCH! Correcting...')
          // Correct the state to match server
          setLikedCards(prev => {
            const next = new Set(prev)
            if (data.liked) {
              next.add(cardId)
            } else {
              next.delete(cardId)
            }
            return next
          })
        }
      } else {
        console.warn('⚠️ RPC did not return liked boolean. Data:', data)
      }
      
      // Update local cache
      try {
        if (data && data.liked) {
          await db.likes.put({ postId: cardId, userId: user.id })
          console.log('✅ Like saved to IndexedDB')
        } else {
          await db.likes.delete([cardId, user.id])
          console.log('✅ Like removed from IndexedDB')
        }
      } catch (dbError) {
        console.warn('IndexedDB update failed (non-critical):', dbError)
      }
      
      console.log('=== TOGGLE LIKE COMPLETE ===')
    } catch (e: any) {
      console.error('=== TOGGLE LIKE FAILED ===')
      console.error('Error:', e)
      console.error('Error message:', e?.message)
      console.error('Error stack:', e?.stack)
      
      // Show user-friendly error
      alert(`Failed to ${isCurrentlyLiked ? 'unlike' : 'like'} post: ${e?.message || 'Unknown error'}. Please check your connection and try again.`)
      
      // Revert optimistic update on error
      setLikedCards(prev => {
        const next = new Set(prev)
        if (isCurrentlyLiked) {
          next.add(cardId)
        } else {
          next.delete(cardId)
        }
        console.log('❌ Reverted like state due to error')
        return next
      })
      
      // Queue for offline sync
      try {
        await db.outbox.add({ 
          type: 'like', 
          postId: cardId, 
          userId: user.id, 
          add: !isCurrentlyLiked 
        })
        console.log('📝 Like action queued for offline sync')
      } catch (outboxError) {
        console.error('Failed to queue like action:', outboxError)
      }
    }
  };

  const handleComment = async () => {
    if (commentText.trim() && selectedCard && user?.id) {
      const commentContent = commentText.trim()
      
      // Clear comment immediately for good UX
      setCommentText('')
      
      try {
        // Add retry logic for new users
      let retries = 0
      let error = null
      
      while (retries < 3) {
        const result = await supabase
          .rpc('add_comment_ext', {
            post_id_param: selectedCard.id,
            external_id_param: user.id,
            content_param: commentContent
          })
        
        error = result.error
        
        if (!error) break
        
        // If profile not found, wait and retry
        if (error.message?.includes('profile') || error.message?.includes('user')) {
          console.log(`Profile not ready for comment, retry ${retries + 1}/3...`)
          await new Promise(resolve => setTimeout(resolve, 500))
          retries++
        } else {
          break
        }
      }
        if (error) throw error
        
        // Update local cache
        await db.comments.add({ 
          postId: selectedCard.id, 
          userId: user.id, 
          content: commentContent, 
          createdAt: Date.now() 
        })
      } catch (e) {
        console.warn('comment insert failed, queuing for offline sync:', e)
        
        // Queue for offline sync
        try {
          await db.outbox.add({ 
            type: 'comment', 
            postId: selectedCard.id, 
            userId: user.id, 
            content: commentContent 
          })
        } catch (outboxError) {
          console.warn('Failed to queue comment action:', outboxError)
        }
      }
    }
  };

  // Server-side refetch using RPC with sorting
  const refetchPosts = async (sortBy: 'created_at' | 'likes' | 'comments' = 'created_at') => {
    try {
      console.log('Refetching posts with sort:', sortBy)
      const { data: postsData, error: postsError } = await supabase
        .rpc('get_feed_posts', {
          page_size: 100,
          page_offset: 0,
          subgroup_filter: null,
          content_type_filter: null,
          sort_by: sortBy
        })

      if (postsError) {
        console.error('Failed to fetch posts:', postsError)
        throw postsError
      }

      if (postsData && Array.isArray(postsData)) {
        // First, get all unique subgroup IDs from posts
        const subgroupIds = Array.from(new Set(postsData.filter((post: any) => post.subgroup_id).map((post: any) => post.subgroup_id)))
        
        // Fetch subgroup names and slugs for all unique subgroup IDs
        let subgroupNames: Record<string, string> = {}
        let subgroupSlugs: Record<string, string> = {}
        if (subgroupIds.length > 0) {
          try {
            const { data: subgroupsData } = await supabase
              .from('subgroups')
              .select('id, name, slug')
              .in('id', subgroupIds)
            
            if (subgroupsData) {
              subgroupNames = subgroupsData.reduce((acc, subgroup) => {
                acc[subgroup.id] = subgroup.name
                return acc
              }, {} as Record<string, string>)
              subgroupSlugs = subgroupsData.reduce((acc, subgroup) => {
                acc[subgroup.id] = subgroup.slug
                return acc
              }, {} as Record<string, string>)
            }
          } catch (error) {
            console.warn('Failed to fetch subgroup data:', error)
          }
        }

        const mapped: MediaCard[] = postsData
          .filter((post: any) => post && post.id) // Filter out invalid posts
          .map((post: any) => ({
          id: String(post.id),
            type: post.content_type || 'image',
            title: post.title || 'Untitled',
          description: post.description ?? undefined,
            imageUrl: post.media_url || '',
            aspectRatio: 'square' as const,
          audioUrl: post.audio_url ?? undefined,
          videoUrl: post.video_url ?? undefined,
          creator: post.creator_username || 'Anonymous',
            date: post.created_at || new Date().toISOString(),
          isCurated: post.is_curated ?? false,
          views: post.views ?? 0,
          subgroupId: post.subgroup_id ?? undefined,
          subgroupName: post.subgroup_id ? subgroupNames[post.subgroup_id] : undefined,
          subgroupSlug: post.subgroup_id ? subgroupSlugs[post.subgroup_id] : undefined,
            tags: Array.isArray(post.tags) ? post.tags.filter((t: any) => t !== null && t !== undefined) : [],
        }))

        console.log('Mapped posts:', mapped.length)
        setPosts(mapped)

        try {
          await db.posts.clear()
          await db.posts.bulkPut(
            mapped.map((m) => ({
              id: m.id,
              type: m.type,
              title: m.title,
              description: m.description ?? null,
              imageUrl: m.imageUrl,
              aspectRatio: m.aspectRatio,
              audioUrl: m.audioUrl,
              videoUrl: m.videoUrl,
              creator: m.creator,
              date: m.date,
              isCurated: m.isCurated,
              views: m.views,
              subgroupId: m.subgroupId ?? null,
              subgroupName: m.subgroupName ?? null,
              subgroupSlug: m.subgroupSlug ?? null,
            }))
          )
        } catch (cacheError) {
          console.warn('Failed to update cache:', cacheError)
        }
      } else {
        console.warn('No posts data returned from get_feed_posts')
        setPosts([])
      }
    } catch (e: any) {
      console.error('Failed to fetch fresh posts:', e)
      // Don't clear posts on error - keep showing cached data
    }
  }

  // Fair feed algorithm fetch
  const fetchFairFeed = async () => {
    try {
      console.log('Fetching fair feed...')
      const { data: fairPosts, error: fairError } = await supabase
        .rpc('get_fair_feed', {
          viewer_id_param: user?.id || null,
          page_size_param: 100,
          page_offset_param: 0
        })

      if (fairError) {
        console.error('Failed to fetch fair feed:', fairError)
        throw fairError
      }

      if (fairPosts && Array.isArray(fairPosts)) {
        const mapped: MediaCard[] = fairPosts
          .filter((post: any) => post && post.id)
          .map((post: any) => ({
            id: String(post.id),
            type: post.content_type || 'image',
            title: post.title || 'Untitled',
            description: post.description ?? undefined,
            imageUrl: post.media_url || '',
            aspectRatio: 'square' as const,
            audioUrl: post.audio_url ?? undefined,
            videoUrl: post.video_url ?? undefined,
            creator: post.creator_username || 'Anonymous',
            date: post.created_at || new Date().toISOString(),
            isCurated: false,
            views: post.views_count ?? 0,
            tags: [],
          }))

        console.log('Fair feed posts:', mapped.length)
        setPosts(mapped)
      }
    } catch (e: any) {
      console.error('Failed to fetch fair feed:', e)
      // Fallback to regular feed
      await refetchPosts('created_at')
    }
  }

  useEffect(() => {
    (async () => {
      // 1. Load from local cache first for instant display
      try {
        const cached = await db.posts.orderBy('date').reverse().toArray()
        if (cached.length > 0) {
          setPosts(
            cached.map((r) => ({
              id: r.id,
              type: r.type as any,
              title: r.title,
              imageUrl: r.imageUrl,
              aspectRatio: r.aspectRatio,
              audioUrl: r.audioUrl,
              videoUrl: r.videoUrl,
              creator: r.creator,
              date: r.date,
              isCurated: r.isCurated,
              views: r.views,
              subgroupId: r.subgroupId ?? undefined,
              subgroupName: r.subgroupName ?? undefined,
              subgroupSlug: r.subgroupSlug ?? undefined,
              description: r.description ?? undefined,
              tags: [],
            }))
          )
        }
      } catch (e) {
        console.warn('Failed to load cached posts:', e)
      }

      // 2. Fetch fresh data from Supabase via RPC (no auth required)
      await refetchPosts('created_at')
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        // Silent: No user logged in, guest mode (can't load likes)
        setLikedCards(new Set())
        return
      }
      
      console.log('🔄 Loading user likes for:', user.id)
      
      try {
        const { data, error } = await callRpc<any[]>('get_user_likes_ext')
        
        if (error) {
          console.error('❌ Failed to load likes RPC error:', error)
          throw error
        }
        
        if (data && Array.isArray(data)) {
          const likedPostIds = data.map((r: any) => String(r.post_id))
          console.log('✅ Loaded user likes:', likedPostIds.length, 'posts')
          console.log('Liked post IDs:', likedPostIds)
          setLikedCards(new Set(likedPostIds))
        } else {
          console.log('ℹ️ No likes data returned (new user or empty)')
          setLikedCards(new Set())
        }
      } catch (e: any) {
        console.error('❌ Load likes failed:', e)
        console.error('Error message:', e?.message)
        console.error('Error details:', e)
        // Set empty likes for new users - don't block the app
        setLikedCards(new Set())
      }
    })()
  }, [user?.id])
  
  // Real-time subscription for likes to sync across tabs/windows
  useEffect(() => {
    if (!user?.id) {
      // Silent: No user logged in, guest mode (no real-time sync needed)
      return
    }
    
    console.log('🔄 Setting up real-time likes subscription for:', user.id)
    
    let channel: any = null
    
    // Get the profile ID for this user and then subscribe
    const setupSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .maybeSingle()
        
        if (error || !data) {
          console.warn('⚠️ Failed to get profile ID for real-time likes:', error)
          return
        }
        
        const profileId = data.id
        console.log('✅ Got profile ID for real-time subscription:', profileId)
        
        // Subscribe to likes table changes for this user
        channel = supabase
          .channel(`user-likes-sync-${profileId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'likes',
              filter: `user_id=eq.${profileId}`
            },
            (payload) => {
              console.log('🔔 Real-time likes change detected:', payload)
              
              if (payload.eventType === 'INSERT') {
                const postId = String((payload.new as any).post_id)
                console.log('➕ Adding like for post:', postId)
                setLikedCards(prev => {
                  const next = new Set(prev)
                  next.add(postId)
                  return next
                })
              } else if (payload.eventType === 'DELETE') {
                const postId = String((payload.old as any).post_id)
                console.log('➖ Removing like for post:', postId)
                setLikedCards(prev => {
                  const next = new Set(prev)
                  next.delete(postId)
                  return next
                })
              }
            }
          )
          .subscribe()
        
        console.log('✅ Real-time likes subscription active')
      } catch (e) {
        console.error('❌ Failed to setup real-time likes subscription:', e)
      }
    }
    
    setupSubscription()
    
    return () => {
      if (channel) {
        console.log('🔌 Unsubscribing from real-time likes')
        channel.unsubscribe()
      }
    }
  }, [user?.id])

  // View tracking function
  const trackView = async (postId: string) => {
    try {
      // Track in local history for authenticated users
      if (user?.id) {
        await db.userHistory.add({
          userId: user.id,
          action: 'view',
          targetId: postId,
          targetType: 'post',
          timestamp: Date.now()
        })
      }

      // Track view in Supabase (allows null user)
      await callRpc('track_view', {
        post_id_param: postId,
        user_id_param: null
      })
    } catch (e) {
      console.warn('trackView failed', e)
    }
  }

  // Track user interactions
  const trackUserAction = async (action: string, targetId: string, targetType: string) => {
    if (!user?.id) return
    
    try {
      await db.userHistory.add({
        userId: user.id,
        action,
        targetId,
        targetType,
        timestamp: Date.now()
      })
    } catch (e) {
      console.warn('trackUserAction failed', e)
    }
  }

  // Track subgroup visits
  const trackSubgroupVisit = async (subgroupSlug: string) => {
    await trackUserAction('view', subgroupSlug, 'subgroup')
  }

  // Background sync for offline support
  useEffect(() => {
    let stop = false
    const syncOfflineActions = async () => {
      if (stop) return
      
      try {
        // Process any pending offline actions
        const pendingActions = await db.outbox.limit(10).toArray()
        
        for (const action of pendingActions) {
          try {
            if (action.type === 'like') {
              if (action.add) {
                await callRpc('toggle_like_ext', {
                  post_id_param: action.postId,
                })
              } else {
                await callRpc('toggle_like_ext', {
                  post_id_param: action.postId,
                })
              }
            } else if (action.type === 'comment') {
              await callRpc('add_comment_ext', {
                post_id_param: action.postId,
                content_param: action.content
              })
            }
            
            // Remove from outbox after successful sync
            try {
              await db.outbox.delete((action as any).id)
            } catch (e) {
              // ignore if key missing
            }
          } catch (e) {
            // Keep in outbox for retry
            console.warn('Failed to sync action:', action, e)
          }
        }
      } catch (e) {
        console.warn('Background sync failed:', e)
      }
      
      // Retry every 30 seconds
      setTimeout(syncOfflineActions, 30000)
    }
    
    syncOfflineActions()
    return () => { stop = true }
  }, [])

  const value: PostContextType = {
    posts,
    setPosts,
    likedCards,
    toggleLike,
    playingAudio,
    setPlayingAudio,
    selectedCard,
    setSelectedCard,
    showDetailModal,
    setShowDetailModal,
    commentText,
    setCommentText,
    handleComment,
    trackView,
    refetchPosts,
    useFairFeed,
    setUseFairFeed,
    fetchFairFeed,
    trackUserAction,
    trackSubgroupVisit
  };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
}



