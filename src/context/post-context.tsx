'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/context/auth-context'
import db from '@/lib/db'

export interface MediaCard {
  id: string;
  type: 'music' | 'physical-art' | 'image' | 'edits' | 'video' | 'film' | 'graphic-design';
  title: string;
  imageUrl: string;
  aspectRatio: 'square' | 'portrait' | 'landscape';
  audioUrl?: string;
  videoUrl?: string;
  creator: string;
  date: string;
  isCurated?: boolean;
  views: number;
  subgroupId?: string;
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
    setLikedCards(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId)
      return next
    })
    try {
      if (!user?.id) return
      // upsert/delete like
      const exists = likedCards.has(cardId)
      if (!exists) {
        // queue to outbox and optimistic cache
        await db.likes.put({ postId: cardId, userId: user.id })
        await db.outbox.add({ type: 'like', postId: cardId, userId: user.id, add: true })
      } else {
        await db.likes.delete([cardId, user.id])
        await db.outbox.add({ type: 'like', postId: cardId, userId: user.id, add: false })
      }
    } catch (e) {
      console.warn('toggleLike failed', e)
    }
  };

  const handleComment = async () => {
    if (commentText.trim() && selectedCard && user?.id) {
      try {
        await db.comments.add({ postId: selectedCard.id, userId: user.id, content: commentText.trim(), createdAt: Date.now() })
        await db.outbox.add({ type: 'comment', postId: selectedCard.id, userId: user.id, content: commentText.trim() })
        setCommentText('')
      } catch (e) {
        console.warn('comment insert failed', e)
      }
    }
  };

  useEffect(() => {
    (async () => {
      // 1) read from local cache first
      const cached = await db.posts.orderBy('date').reverse().toArray()
      if (cached.length) {
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
          }))
        )
      }
      // 2) fetch from Supabase and refresh cache
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id,content_type,title,media_url,audio_url,video_url,is_curated,views,created_at,creator_id,subgroup_id')
          .order('created_at', { ascending: false })
          .limit(100)
        if (error) throw error
        if (data) {
          // Fetch author names for creator_id
          const creatorIds = Array.from(new Set(data.map((r: any) => r.creator_id).filter(Boolean)))
          let idToName: Record<string, string> = {}
          if (creatorIds.length) {
            try {
              const { data: authors } = await supabase.from('user').select('id,name,email').in('id', creatorIds)
              if (authors) {
                authors.forEach((u: any) => { idToName[String(u.id)] = u.name || u.email || 'brokebop' })
              }
            } catch {}
          }

          const mapped: MediaCard[] = data.map((r: any) => ({
            id: String(r.id),
            type: r.content_type,
            title: r.title,
            imageUrl: r.media_url,
            aspectRatio: 'square',
            audioUrl: r.audio_url ?? undefined,
            videoUrl: r.video_url ?? undefined,
            creator: idToName[String(r.creator_id)] || 'brokebop',
            date: r.created_at,
            isCurated: r.is_curated ?? false,
            views: r.views ?? 0,
            subgroupId: r.subgroup_id ?? undefined,
          }))
          setPosts(mapped)
          await db.posts.clear()
          await db.posts.bulkPut(
            mapped.map((m) => ({
              id: m.id,
              type: m.type,
              title: m.title,
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
        }
      } catch (e) {
        console.warn('Supabase fetch failed', e)
      }
    })()
  }, [])

  useEffect(() => {
    (async () => {
      if (!user?.id) return
      try {
        const { data, error } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
        if (error) throw error
        if (data) setLikedCards(new Set(data.map((r: any) => String(r.post_id))))
      } catch (e) {
        console.warn('load likes failed', e)
      }
    })()
  }, [user?.id])

  // Background sync
  useEffect(() => {
    let stop = false
    const tick = async () => {
      if (stop) return
      const jobs = await db.outbox.limit(10).toArray()
      for (const j of jobs) {
        try {
          if (j.type === 'like') {
            if (j.add) {
              await supabase.from('likes').insert({ post_id: j.postId, user_id: j.userId, source_id: 'decro' })
            } else {
              await supabase.from('likes').delete().eq('post_id', j.postId).eq('user_id', j.userId)
            }
          } else if (j.type === 'comment') {
            await supabase.from('comments').insert({ post_id: j.postId, user_id: j.userId, content: j.content, source_id: 'decro' })
          }
          await db.outbox.delete(j as any)
        } catch (e) {
          // keep in outbox for retry
        }
      }
      setTimeout(tick, 3000)
    }
    tick()
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
    handleComment
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



