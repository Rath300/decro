'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/context/auth-context'
import db from '@/lib/db'

export interface MediaCard {
  id: string;
  type: 'music' | 'physical-art' | 'image' | 'edits' | 'video' | 'film' | 'graphic-design' | 'text';
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
  tags?: string[];
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
  const { user } = useAuth();

  const toggleLike = async (cardId: string) => {
    if (!user?.id) return
    
    // Optimistic update for instant UI response
    const isCurrentlyLiked = likedCards.has(cardId)
    setLikedCards(prev => {
      const next = new Set(prev)
      if (isCurrentlyLiked) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
    
    // Track user action
    await trackUserAction(isCurrentlyLiked ? 'unlike' : 'like', cardId, 'post')
    
    try {
      // Try to sync with server
      const { data, error } = await supabase.rpc('toggle_like_ext', {
        post_id_param: cardId,
        external_id_param: user.id
      })
      
      if (error) throw error
      
      // Update local cache
      if (data.liked) {
        await db.likes.put({ postId: cardId, userId: user.id })
      } else {
        await db.likes.delete([cardId, user.id])
      }
    } catch (e) {
      console.warn('toggleLike failed, queuing for offline sync:', e)
      
      // Queue for offline sync
      try {
        await db.outbox.add({ 
          type: 'like', 
          postId: cardId, 
          userId: user.id, 
          add: !isCurrentlyLiked 
        })
      } catch (outboxError) {
        console.warn('Failed to queue like action:', outboxError)
      }
    }
  };

  const handleComment = async () => {
    if (commentText.trim() && selectedCard && user?.id) {
      const commentContent = commentText.trim()
      
      // Clear comment immediately for good UX
      setCommentText('')
      
      try {
        const { error } = await supabase
          .rpc('add_comment_ext', {
            post_id_param: selectedCard.id,
            external_id_param: user.id,
            content_param: commentContent
          })
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
      const { data: postsData, error: postsError } = await supabase
        .rpc('get_feed_posts', {
          page_size: 100,
          page_offset: 0,
          subgroup_filter: null,
          content_type_filter: null,
          sort_by: sortBy
        })

      if (postsError) throw postsError

      if (postsData) {
        const mapped: MediaCard[] = postsData.map((post: any) => ({
          id: String(post.id),
          type: post.content_type,
          title: post.title,
          description: post.description ?? undefined,
          imageUrl: post.media_url,
          aspectRatio: 'square',
          audioUrl: post.audio_url ?? undefined,
          videoUrl: post.video_url ?? undefined,
          creator: post.creator_username || 'Anonymous',
          date: post.created_at,
          isCurated: post.is_curated ?? false,
          views: post.views ?? 0,
          subgroupId: post.subgroup_id ?? undefined,
          tags: Array.isArray(post.tags) ? post.tags : undefined,
        }))

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
            }))
          )
        } catch (cacheError) {
          console.warn('Failed to update cache:', cacheError)
        }
      }
    } catch (e) {
      console.warn('Failed to fetch fresh posts:', e)
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
              description: r.description ?? undefined,
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
      if (!user?.id) return
      try {
        const { data, error } = await supabase
          .rpc('get_user_likes_ext', { external_id_param: user.id })
        
        if (error) throw error
        if (data) setLikedCards(new Set(data.map((r: any) => String(r.post_id))))
      } catch (e) {
        console.warn('load likes failed', e)
      }
    })()
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
      await supabase.rpc('track_view', {
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
                await supabase.rpc('toggle_like_ext', {
                  post_id_param: action.postId,
                  external_id_param: action.userId
                })
              } else {
                await supabase.rpc('toggle_like_ext', {
                  post_id_param: action.postId,
                  external_id_param: action.userId
                })
              }
            } else if (action.type === 'comment') {
              await supabase.rpc('add_comment_ext', {
                post_id_param: action.postId,
                external_id_param: action.userId,
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



