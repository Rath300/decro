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
}

export interface PostComment {
  id: number
  post_id: string
  user_id: string
  content: string
  created_at: string
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
  handleComment: () => Promise<void>;
  loadComments: (postId: string) => Promise<void>;
  commentsByPost: Record<string, PostComment[]>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

// Mock data - same as feed
const mockMediaCards: MediaCard[] = [
  {
    id: '1',
    type: 'music',
    title: 'Synth Experiment #1',
    imageUrl: '/image.png',
    aspectRatio: 'square',
    audioUrl: '/synth.wav',
    creator: 'Joshua Koshy',
    date: '2024-01-15',
    isCurated: true,
    views: 234
  },
  {
    id: '2',
    type: 'image',
    title: 'Urban Photography',
    imageUrl: '/motorcycleguy.png',
    aspectRatio: 'portrait',
    creator: 'Ryley Prediction',
    date: '2024-01-14',
    views: 189
  },
  {
    id: '3',
    type: 'physical-art',
    title: 'Abstract Composition',
    imageUrl: '/birmingham-museums-trust-sJr8LDyEf7k-unsplash.jpg',
    aspectRatio: 'landscape',
    creator: 'Rishi Viduru',
    date: '2024-01-13',
    isCurated: true,
    views: 156
  },
  {
    id: '4',
    type: 'physical-art',
    title: 'Digital Art Piece',
    imageUrl: '/tumblr_ea02597654780f690c116d76d8b54241_2101b683_500.png',
    aspectRatio: 'square',
    creator: 'Rishi Viduru',
    date: '2024-01-12',
    views: 298
  },
  {
    id: '5',
    type: 'music',
    title: 'Acoustic Session',
    imageUrl: '/sunshine.png',
    aspectRatio: 'square',
    audioUrl: '/acoustic-guitar-loop-f-91bpm-132687.mp3',
    creator: 'Joshua Koshy',
    date: '2024-01-11',
    views: 445
  },
  {
    id: '6',
    type: 'image',
    title: 'Street Photography',
    imageUrl: '/jc-gellidon-xDsq3u3ZUqc-unsplash (1).jpg',
    aspectRatio: 'portrait',
    creator: 'Ryley Prediction',
    date: '2024-01-10',
    views: 167
  },
  {
    id: '7',
    type: 'physical-art',
    title: 'Classical Art Piece',
    imageUrl: '/lucas-gouvea-aoEwuEH7YAs-unsplash.jpg',
    aspectRatio: 'landscape',
    creator: 'Japan So Cool',
    date: '2024-01-09',
    isCurated: true,
    views: 323
  },
  {
    id: '8',
    type: 'music',
    title: 'Ambient Drift',
    imageUrl: '/warmvibes.png',
    aspectRatio: 'square',
    audioUrl: '/mouse-squeaks-68287.mp3',
    creator: 'Joshua Koshy',
    date: '2024-01-08',
    views: 278
  },
  {
    id: '9',
    type: 'edits',
    title: 'Photo Edit Collection',
    imageUrl: '/mountain.png',
    aspectRatio: 'square',
    creator: 'Digital Editor',
    date: '2024-01-07',
    views: 145
  },
  {
    id: '10',
    type: 'video',
    title: 'Short Film',
    imageUrl: '/bmw.png',
    aspectRatio: 'landscape',
    videoUrl: '/sample-video.mp4',
    creator: 'Video Creator',
    date: '2024-01-06',
    views: 567
  },
  {
    id: '11',
    type: 'film',
    title: 'Documentary',
    imageUrl: '/shwarma.png',
    aspectRatio: 'landscape',
    videoUrl: '/documentary.mp4',
    creator: 'Film Director',
    date: '2024-01-05',
    isCurated: true,
    views: 892
  },
  {
    id: '12',
    type: 'graphic-design',
    title: 'Brand Identity',
    imageUrl: '/warmvibes.png',
    aspectRatio: 'square',
    creator: 'Graphic Designer',
    date: '2024-01-04',
    views: 234
  }
];

export function PostProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<MediaCard[]>([]);
  const [likedCards, setLikedCards] = useState<Set<string>>(new Set());
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<MediaCard | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();
  const [commentsByPost, setCommentsByPost] = useState<Record<string, PostComment[]>>({});

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
        await db.likes.put({ postId: cardId, userId: user.id })
        await db.outbox.add({ type: 'like', postId: cardId, userId: user.id, add: true })
        await supabase.from('likes').insert({ post_id: cardId, user_id: user.id, source_id: 'decro' })
      } else {
        await db.likes.delete([cardId, user.id])
        await db.outbox.add({ type: 'like', postId: cardId, userId: user.id, add: false })
        await supabase.from('likes').delete().eq('post_id', cardId).eq('user_id', user.id)
      }
    } catch (e) {
      console.warn('toggleLike failed', e)
    }
  };

  const handleComment = async (): Promise<void> => {
    if (commentText.trim() && selectedCard && user?.id) {
      const content = commentText.trim()
      // optimistic UI update
      const temp: PostComment = {
        id: -Date.now(),
        post_id: selectedCard.id,
        user_id: user.id,
        content,
        created_at: new Date().toISOString(),
      }
      setCommentsByPost(prev => ({
        ...prev,
        [selectedCard.id]: [...(prev[selectedCard.id] || []), temp]
      }))
      setCommentText('')

      try {
        await db.comments.add({ postId: selectedCard.id, userId: user.id, content, createdAt: Date.now() })
        await db.outbox.add({ type: 'comment', postId: selectedCard.id, userId: user.id, content })
        const { data } = await supabase
          .from('comments')
          .insert({ post_id: selectedCard.id, user_id: user.id, content, source_id: 'decro' })
          .select('id, post_id, user_id, content, created_at')
          .single()
        if (data) {
          setCommentsByPost(prev => ({
            ...prev,
            [selectedCard.id]: (prev[selectedCard.id] || []).map(c => c.id === temp.id ? (data as PostComment) : c)
          }))
        }
      } catch (e) {
        console.warn('comment insert failed', e)
      }
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data } = await supabase
        .from('comments')
        .select('id, post_id, user_id, content, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (data) {
        setCommentsByPost(prev => ({ ...prev, [postId]: data as PostComment[] }))
      }
    } catch (e) {
      console.warn('load comments failed', e)
    }
  }

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
          }))
        )
      }
      // 2) fetch from Supabase and refresh cache
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id,content_type,title,media_url,audio_url,video_url,is_curated,views,created_at,creator_id')
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
            views: typeof r.views === 'number' ? r.views : parseInt(r.views || '0', 10),
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
    handleComment,
    loadComments,
    commentsByPost,
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