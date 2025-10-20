'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/context/post-context';
import type { MediaCard } from '@/context/post-context';
import { useAuth } from '@/context/auth-context';
import AuthModal from './auth-modal';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeComments, type Comment as RealtimeComment } from '@/hooks/use-realtime-comments';
import { PostStats } from './post-stats';
import supabase from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
// SiteHeader removed per request to avoid obstruction



export default function FeedPage() {
  const router = useRouter();
  const { 
    posts, 
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
    refetchPosts
  } = usePosts();
  
  // Global header handles navigation; keep state for legacy references if any
  const [activeTab, setActiveTab] = useState('feed');
  const [displayedCards, setDisplayedCards] = useState<MediaCard[]>([]);
  const [sortMode, setSortMode] = useState<'random' | 'newest' | 'curated'>('random');
  const [showStats, setShowStats] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState('');
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    if (sortMode === 'random') {
      const shuffled = [...posts].sort(() => Math.random() - 0.5);
      setDisplayedCards(shuffled);
    } else if (sortMode === 'newest') {
      const sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDisplayedCards(sorted);
    } else if (sortMode === 'curated') {
      const filtered = [...posts].filter(card => card.isCurated);
      setDisplayedCards(filtered);
    } else {
      setDisplayedCards(posts);
    }
  }, [posts, sortMode]);

  const { signOut, isAuthenticated, user } = useAuth();
  const [commentsRefreshSignal, setCommentsRefreshSignal] = useState(0);
  const [optimisticComments, setOptimisticComments] = useState<RealtimeComment[]>([]);
  const [lastOptimisticContent, setLastOptimisticContent] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const handleLikeClick = (cardId: string) => {
    if (!isAuthenticated) {
      setAuthModalAction('like posts');
      setShowAuthModal(true);
      return;
    }
    toggleLike(cardId);
  };

  const handleCommentSubmit = () => {
    if (!isAuthenticated) {
      setAuthModalAction('comment on posts');
      setShowAuthModal(true);
      return;
    }
    // Capture current text before context clears it
    const content = commentText.trim();
    handleComment();
    if (selectedCard && content) {
      // Optimistic append to detail view comments
      const optimistic: RealtimeComment = {
        id: `local-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user?.id || 'anon',
        username: user?.name || user?.email || 'You',
        full_name: user?.name || null,
        avatar_url: null,
      };
      setOptimisticComments((prev) => [optimistic, ...prev]);
      setLastOptimisticContent(content);
      // Trigger a refetch in CommentsList to reconcile soon after
      setCommentsRefreshSignal((n) => n + 1);
    }
  };

  const handleCardClick = (card: MediaCard) => {
    // Track view
    trackView(card.id);
    
    if (card.type === 'text') {
      // For text posts, redirect to Reddit-style forum page
      router.push(`/post/${card.id}`);
    } else if (card.type === 'music') {
      // For music, require double click or show a different interaction
      handleAudioPlay(card.id, card.audioUrl!);
    } else if (['video', 'film'].includes(card.type)) {
      // For video/film, show detail modal with video player
      setSelectedCard(card);
      setShowDetailModal(true);
    } else {
      // For images and other content, show detail modal
      setSelectedCard(card);
      setShowDetailModal(true);
    }
  };

  const handlePortfolioClick = async (creatorId: string) => {
    // Get username from creator ID and navigate to public profile
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', creatorId)
        .single()
      
      if (data?.username) {
        router.push(`/profile/${data.username}`)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    }
  };



  const getAspectRatioClass = (aspectRatio: string) => {
    switch (aspectRatio) {
      case 'portrait':
        return 'aspect-3-4';
      case 'landscape':
        return 'aspect-4-3';
      default:
        return 'aspect-square';
    }
  };

  const handleSort = async (mode: 'random' | 'newest' | 'curated') => {
    console.log('Sorting by:', mode); // Debug log
    setSortMode(mode);
    let sorted: MediaCard[];
    
    switch (mode) {
      case 'random':
        sorted = [...posts].sort(() => Math.random() - 0.5);
        break;
      case 'newest':
        await refetchPosts('created_at');
        sorted = [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'curated':
        sorted = [...posts].filter(card => card.isCurated);
        break;
      default:
        sorted = posts;
    }
    
    setDisplayedCards(sorted);
  };

  const handleAudioPlay = (cardId: string, audioUrl: string) => {
    // Stop any currently playing audio
    if (playingAudio && playingAudio !== cardId) {
      const currentAudio = audioRefs.current[playingAudio];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    }

    // Play the selected audio
    if (!audioRefs.current[cardId]) {
      audioRefs.current[cardId] = new Audio(audioUrl);
    }

    const audio = audioRefs.current[cardId];
    
    if (playingAudio === cardId) {
      // If same audio is playing, pause it
      audio.pause();
      audio.currentTime = 0;
      setPlayingAudio(null);
    } else {
      // Play new audio
      audio.play();
      setPlayingAudio(cardId);
      
      // Reset when audio ends
      audio.onended = () => {
        setPlayingAudio(null);
      };
    }
  };

  const AudioWaveform = ({ isPlaying }: { isPlaying: boolean }) => (
    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
      <div className="flex items-end space-x-1 h-12">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`w-1 bg-white rounded-full transition-all duration-300 ${
              isPlaying 
                ? 'animate-pulse' 
                : 'opacity-60'
            }`}
            style={{
              height: isPlaying 
                ? `${Math.random() * 100 + 20}%` 
                : '40%',
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    </div>
  );

  const CuratedBadge = () => (
    <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 text-xs font-['Space_Mono'] font-bold border border-black">
      CURATED
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">

      {/* Old Internet Controls */}
      <div className="max-w-7xl mx-auto px-4 py-4 border-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-['Space_Mono'] text-gray-600">Sort by:</span>
            <div className="flex space-x-2">
              {[
                { id: 'random', label: 'Random' },
                { id: 'newest', label: 'Newest' },
                { id: 'curated', label: 'Curated' }
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSort(option.id as 'random' | 'newest' | 'curated')}
                  className={`px-3 py-1 text-xs font-['Space_Mono'] border border-black transition-colors ${
                    sortMode === option.id
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-xs font-['Space_Mono'] text-gray-600 hover:text-black transition-colors"
            >
              {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            <span className="text-xs font-['Space_Mono'] text-gray-500">
              {displayedCards.length} items • No algorithm
            </span>
          </div>
        </div>
      </div>

      {/* Feed Content - Floating masonry layout */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {displayedCards.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-black">
            <p className="text-black font-['Space_Mono']">No posts yet.</p>
            <p className="text-black font-['Space_Mono'] text-sm mt-2">Be the first to <a href="/create" className="underline">create a post</a>.</p>
          </div>
        ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          <AnimatePresence>
            {displayedCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.98 }}
                className="break-inside-avoid mb-4 group cursor-pointer"
              >
                              {/* Floating Media Card - No card background */}
                <div 
                  className={`relative ${getAspectRatioClass(card.aspectRatio)} overflow-hidden cursor-pointer`}
                  onClick={() => handleCardClick(card)}
                >
                {!card.imageUrl ? (
                  <div className="w-full h-full bg-white border border-gray-200 flex items-center justify-center p-4">
                    <div className="text-center">
                      <h4 className="text-sm md:text-base font-['Space_Mono'] text-black line-clamp-2">{card.title || 'Post'}</h4>
                      {card.description && (
                        <p className="mt-2 text-xs md:text-sm text-gray-600 line-clamp-3">{card.description}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
                
                {/* Curated badge */}
                {card.isCurated && <CuratedBadge />}
                
                {/* Audio waveform overlay for music cards */}
                {card.type === 'music' && card.audioUrl && (
                  <AudioWaveform isPlaying={playingAudio === card.id} />
                )}

                {/* Play button indicator for music */}
                {card.type === 'music' && card.audioUrl && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-70 rounded-full flex items-center justify-center">
                    <div className={`w-0 h-0 border-l-4 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1 ${
                      playingAudio === card.id ? 'hidden' : ''
                    }`} />
                    <div className={`w-2 h-2 bg-white rounded-sm ${
                      playingAudio === card.id ? '' : 'hidden'
                    }`} />
                  </div>
                )}

                {/* Video play overlay for video/film */}
                {['video', 'film'].includes(card.type) && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 5v14l11-7z" fill="black"/>
                      </svg>
                    </div>
                  </div>
                )}

                {/* Type indicator for edits */}
                {card.type === 'edits' && (
                  <div className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-70 rounded-full flex items-center justify-center text-white text-sm">
                    ✂️
                  </div>
                )}
              </div>

                                      {/* Card Info */}
                        <div className="mt-2 space-y-1">
                          {card.title && (
                            <button
                              className="text-left w-full text-sm font-['Space_Mono'] text-black hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCard(card);
                                setShowDetailModal(true);
                              }}
                            >
                              {card.title}
                            </button>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <a
                              href={`/profile/${card.creator.toLowerCase().replace(/\s+/g, '_')}`}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors line-clamp-1"
                              title={card.creator}
                            >
                              {card.creator}
                            </a>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLikeClick(card.id);
                              }}
                              className={`p-1 rounded-full transition-all duration-200 ${
                                likedCards.has(card.id)
                                  ? 'bg-red-50 text-red-500'
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <svg 
                                width="12" 
                                height="12" 
                                viewBox="0 0 24 24" 
                                fill={likedCards.has(card.id) ? "currentColor" : "none"}
                                stroke="currentColor" 
                                strokeWidth="2"
                                className="transition-all duration-200"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                            </button>
                          </div>
                          
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between">
                            <PostStats 
                              postId={card.id}
                              initialViews={card.views}
                            />
                            <button
                              className="ml-2 px-2 py-1 text-xs bg-black text-white border border-black hover:bg-gray-800 transition-colors"
                              onClick={(e) => { e.stopPropagation(); setSelectedCard(card); setShowDetailModal(true) }}
                            >
                              View details
                            </button>
                          </div>
                        </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        )}

        {/* Old Internet Footer */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8">
          <p className="text-sm font-['Space_Mono'] text-gray-500">
            End of feed • No infinite scroll • Hand-curated content
          </p>
          <p className="text-xs font-['Space_Mono'] text-gray-400 mt-2">
            This is not an algorithmic feed. Content is manually organized.
          </p>
        </div>
      </main>

      {/* Detail Modal - Pinterest Style */}
      <AnimatePresence>
        {showDetailModal && selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
            <div className="flex flex-col lg:flex-row">
              {/* Image/Video Section */}
              <div className="lg:w-2/3 p-6">
                <div className="relative">
                  {['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl ? (
                    <video
                      src={selectedCard.videoUrl}
                      controls
                      className="w-full h-auto rounded-lg"
                    >
                      Your browser does not support the video element.
                    </video>
                  ) : (
                    <img
                      src={selectedCard.imageUrl}
                      alt={selectedCard.title}
                      className="w-full h-auto rounded-lg"
                    />
                  )}
                  {selectedCard.isCurated && (
                    <div className="absolute top-4 left-4 bg-yellow-400 text-black px-3 py-1 text-sm font-['Space_Mono'] font-bold border border-black">
                      CURATED
                    </div>
                  )}
                </div>
              </div>
              
              {/* Info Section */}
              <div className="lg:w-1/3 p-6 border-l border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-['Space_Mono'] font-bold text-black">
                    {selectedCard.title}
                  </h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-500 hover:text-black transition-colors"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handlePortfolioClick(selectedCard.creator);
                      }}
                      className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {selectedCard.creator}
                    </button>
                  </div>
                  
                                      <div className="text-sm font-['Space_Mono'] text-gray-600 mb-4">
                      {new Date(selectedCard.date).toLocaleDateString()} • {selectedCard.views} views
                    </div>
                  
                  {/* Work Description */}
                  <div className="mb-4">
                    <h3 className="text-sm font-['Space_Mono'] font-medium text-black mb-2">
                      About this work
                    </h3>
                    <div className="text-sm font-['Space_Mono'] text-gray-700 leading-relaxed">
                      {selectedCard.description ? (
                        <p>{selectedCard.description}</p>
                      ) : (
                        <p className="text-gray-500">No description provided.</p>
                      )}
                      {Array.isArray((selectedCard as any).tags) && (selectedCard as any).tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(selectedCard as any).tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-1 bg-black text-white text-xs font-['Space_Mono']">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="border-t border-gray-200 pt-4 mb-4 flex items-center gap-3">
                    <button 
                      onClick={() => selectedCard && handleLikeClick(selectedCard.id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                        selectedCard && likedCards.has(selectedCard.id)
                          ? 'bg-red-50 text-red-500'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <svg 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill={selectedCard && likedCards.has(selectedCard.id) ? "currentColor" : "none"}
                        stroke="currentColor" 
                        strokeWidth="2"
                        className="transition-all duration-200"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                      </svg>
                      <span className="font-['Space_Mono'] text-sm">
                        {selectedCard && likedCards.has(selectedCard.id) ? 'Liked' : 'Like'}
                      </span>
                    </button>
                    
                    <EditPostButton postId={selectedCard.id} />
                    <DeletePostButton postId={selectedCard.id} onDeleted={() => setShowDetailModal(false)} refetchPosts={refetchPosts} />
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-['Space_Mono'] font-medium text-black mb-3">
                      Comments
                    </h3>
                    
                    {/* Comment Input */}
                    <div className="flex space-x-2 mb-4">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-['Space_Mono'] text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCommentSubmit();
                          }
                        }}
                      />
                      <button
                        onClick={handleCommentSubmit}
                        disabled={!commentText.trim()}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          commentText.trim()
                            ? 'bg-black text-white hover:bg-gray-800'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2"
                          className="transition-all duration-200"
                        >
                          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                      </button>
                    </div>
                    
                    <CommentsList postId={selectedCard.id} refreshSignal={commentsRefreshSignal} optimisticComments={optimisticComments} />
                  </div>
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action={authModalAction}
      />

    </div>
  );
}

// Comments List Component
function CommentsList({ postId, refreshSignal, optimisticComments }: { postId: string; refreshSignal: number; optimisticComments: RealtimeComment[] }) {
  const { comments, loading, refetch } = useRealtimeComments(postId);
  const [merged, setMerged] = useState<RealtimeComment[]>([]);
  const { isAuthenticated, user } = useAuth();
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replies, setReplies] = useState<Record<string, RealtimeComment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!postId) return;
    refetch();
  }, [refreshSignal]);

  useEffect(() => {
    // Keep optimistic item until a matching server comment appears
    const server = comments || [];
    const optimistic = optimisticComments || [];
    if (optimistic.length === 0) {
      setMerged(server);
      return;
    }
    // match by same content from current user within recent window
    const filteredOptimistic = optimistic.filter(o => !server.some(s => s.content === o.content && Math.abs(new Date(s.created_at).getTime() - new Date(o.created_at).getTime()) < 60000));
    setMerged([...filteredOptimistic, ...server]);
  }, [comments, optimisticComments]);

  if (loading && (!merged || merged.length === 0)) {
    return (
      <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">
        Loading comments...
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div className="text-sm font-['Space_Mono'] text-gray-500 text-center py-4">
        No comments yet. Be the first to comment!
      </div>
    );
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {merged.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
            {comment.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-['Space_Mono'] font-bold text-sm text-black">
                {comment.username || 'Anonymous'}
              </span>
              <span className="font-['Space_Mono'] text-xs text-gray-500">
                {getTimeAgo(comment.created_at)}
              </span>
            </div>
            <p className="font-['Space_Mono'] text-sm text-gray-800 mt-1 break-words">
              {comment.content}
            </p>
            {/* Reply and voting controls */}
            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
              <button
                className="hover:text-black"
                onClick={async () => {
                  if (openReplyFor === comment.id) {
                    setOpenReplyFor(null);
                    return;
                  }
                  setOpenReplyFor(comment.id);
                  // lazy load replies on open
                  if (!replies[comment.id]) {
                    setLoadingReplies(prev => ({ ...prev, [comment.id]: true }));
                    const { data } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: comment.id, page_size: 20, page_offset: 0 });
                    setReplies(prev => ({ ...prev, [comment.id]: (data || []) as any }));
                    setLoadingReplies(prev => ({ ...prev, [comment.id]: false }));
                  }
                }}
              >
                Reply{typeof comment.reply_count === 'number' ? ` (${comment.reply_count})` : ''}
              </button>
              <button
                className="hover:text-red-500 flex items-center gap-1"
                onClick={async () => {
                  if (!isAuthenticated || !user?.id) return;
                  try {
                    const { data, error: rpcError } = await supabase.rpc('toggle_comment_vote_ext', { 
                      comment_id_param: comment.id, 
                      external_id_param: user.id, 
                      direction: 1 
                    });
                    
                    if (rpcError) {
                      console.error('RPC error:', rpcError);
                      return;
                    }
                    
                    console.log('Comment vote response:', data);
                    
                    // Parse the JSON response if it's a string
                    let responseData = data;
                    if (typeof data === 'string') {
                      try {
                        responseData = JSON.parse(data);
                      } catch (e) {
                        console.error('Failed to parse response:', e);
                        refetch();
                        return;
                      }
                    }
                    
                    // Update the comment vote score immediately from the response
                    if (responseData && typeof responseData.vote_score === 'number') {
                      setMerged(prev => prev.map(c => 
                        c.id === comment.id ? { ...c, vote_score: responseData.vote_score } : c
                      ));
                    } else {
                      console.log('No vote_score in response, refetching...');
                      // Fallback: refetch if response doesn't have vote_score
                      refetch();
                    }
                  } catch (error) {
                    console.error('Error toggling comment vote:', error);
                  }
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{comment.vote_score || 0}</span>
              </button>
            </div>
            {openReplyFor === comment.id && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText[comment.id] || ''}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-['Space_Mono'] text-sm text-black focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                     onKeyPress={async (e) => {
                      if (e.key === 'Enter') {
                        const content = (replyText[comment.id] || '').trim();
                        if (!content || !isAuthenticated || !user?.id) return;
                        // optimistic bump reply count and add local reply shell
                        setMerged(prev => prev.map(c => c.id === comment.id ? ({ ...c, reply_count: (c.reply_count ?? 0) + 1 }) : c));
                        setReplies(prev => ({
                          ...prev,
                          [comment.id]: [
                            { id: `local-${Date.now()}`, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: user.id, username: user.name || user.email || 'You', full_name: user.name || null, avatar_url: null } as any,
                            ...(prev[comment.id] || [])
                          ]
                        }));
                        setReplyText(prev => ({ ...prev, [comment.id]: '' }));
                         try {
                           await supabase.rpc('add_reply_ext', { comment_id_param: comment.id, external_id_param: user.id, content_param: content });
                         } catch {}
                        // refresh replies
                        const { data } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: comment.id, page_size: 20, page_offset: 0 });
                        setReplies(prev => ({ ...prev, [comment.id]: (data || []) as any }));
                      }
                    }}
                  />
                   <button
                    className="px-3 py-2 text-xs bg-black text-white rounded"
                    onClick={async () => {
                      const content = (replyText[comment.id] || '').trim();
                      if (!content || !isAuthenticated || !user?.id) return;
                      setMerged(prev => prev.map(c => c.id === comment.id ? ({ ...c, reply_count: (c.reply_count ?? 0) + 1 }) : c));
                      setReplies(prev => ({
                        ...prev,
                        [comment.id]: [
                          { id: `local-${Date.now()}`, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: user.id, username: user.name || user.email || 'You', full_name: user.name || null, avatar_url: null } as any,
                          ...(prev[comment.id] || [])
                        ]
                      }));
                      setReplyText(prev => ({ ...prev, [comment.id]: '' }));
                       try {
                         await supabase.rpc('add_reply_ext', { comment_id_param: comment.id, external_id_param: user.id, content_param: content });
                       } catch {}
                      const { data } = await supabase.rpc('get_comment_replies_with_nesting', { comment_id_param: comment.id, page_size: 20, page_offset: 0 });
                      setReplies(prev => ({ ...prev, [comment.id]: (data || []) as any }));
                    }}
                  >Reply</button>
                </div>
                <div className="pl-2 border-l border-gray-200">
                  {loadingReplies[comment.id] ? (
                    <div className="text-xs text-gray-500">Loading replies...</div>
                  ) : (
                    <div className="space-y-2">
                      {(replies[comment.id] || []).map(r => (
                        <div key={r.id} className="flex gap-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                            {r.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="font-['Space_Mono'] font-bold text-xs text-black">{r.username || 'Anonymous'}</span>
                              {(r as any).replying_to_username && (
                                <span className="font-['Space_Mono'] text-[10px] text-gray-400">
                                  replying to {(r as any).replying_to_username}
                                </span>
                              )}
                              <span className="font-['Space_Mono'] text-[10px] text-gray-500">{getTimeAgo(r.created_at)}</span>
                            </div>
                            <p className="font-['Space_Mono'] text-xs text-gray-800 mt-1 break-words">{r.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Edit Post Button Component
function EditPostButton({ postId }: { postId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user?.id || !postId) return;

    const checkOwnership = async () => {
      try {
        // Get the profile ID from external ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single();

        if (profileError || !profileData) return;

        // Check if the post creator matches the profile ID
        const { data } = await supabase
          .from('posts')
          .select('creator_id')
          .eq('id', postId)
          .single();

        if (data && data.creator_id === profileData.id) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error('Failed to check post ownership:', error);
      }
    };

    checkOwnership();
  }, [user?.id, postId]);

  if (!isOwner) return null;

  return (
    <button
      onClick={() => router.push(`/post/edit/${postId}`)}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      <span className="font-['Space_Mono'] text-sm">Edit</span>
    </button>
  );
}

// Delete Post Button Component
function DeletePostButton({ postId, onDeleted, refetchPosts }: { postId: string; onDeleted: () => void; refetchPosts?: (sortBy?: 'created_at' | 'likes' | 'comments') => Promise<void> }) {
  const { user } = useAuth();
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user?.id || !postId) return;

    const checkOwnership = async () => {
      try {
        // Get the profile ID from external ID
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('external_id', user.id)
          .single();

        if (profileError || !profileData) return;

        // Check if the post creator matches the profile ID
        const { data } = await supabase
          .from('posts')
          .select('creator_id')
          .eq('id', postId)
          .single();

        if (data && data.creator_id === profileData.id) {
          setIsOwner(true);
        }
      } catch (error) {
        console.error('Failed to check post ownership:', error);
      }
    };

    checkOwnership();
  }, [user?.id, postId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      console.log('Attempting to delete post:', postId, 'user:', user?.id);
      
      const { data, error } = await supabase.rpc('delete_post_ext', {
        post_id_param: postId,
        external_id_param: user?.id
      });

      console.log('Delete result:', { data, error });

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      if (data && data.error) {
        toast.error(data.error);
        return;
      }

      if (data && data.success) {
        console.log('Post deleted successfully:', data.deleted_post);
        toast.success('Post deleted successfully');
        onDeleted();
        // Refresh the posts data instead of reloading the page
        if (refetchPosts) {
          await refetchPosts('created_at');
        }
      } else {
        toast.error('Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      toast.error(error.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOwner) return null;

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      <span className="font-['Space_Mono'] text-sm">
        {isDeleting ? 'Deleting...' : 'Delete'}
      </span>
    </button>
  );
} 