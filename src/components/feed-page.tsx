'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePosts } from '@/context/post-context';
import supabase from '@/lib/supabase-client'
import type { MediaCard } from '@/context/post-context';
import { useAuth } from '@/context/auth-context';
import AuthModal from './auth-modal';
import SiteHeader from './SiteHeader'



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
    loadComments,
    commentsByPost
  } = usePosts();
  
  const [activeTab, setActiveTab] = useState('feed');
  const [displayedCards, setDisplayedCards] = useState<MediaCard[]>([]);
  const [sortMode, setSortMode] = useState<'random' | 'newest' | 'curated'>('random');
  const [showStats, setShowStats] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalAction, setAuthModalAction] = useState('');
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [liveViews, setLiveViews] = useState<number | null>(null)
  const [liveLikes, setLiveLikes] = useState<number | null>(null)

  const fetchViewCount = async (postId: string) => {
    try {
      const { count } = await supabase
        .from('views')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
      if (typeof count === 'number') setLiveViews(count)
    } catch {
      setLiveViews(null)
    }
  }

  const fetchLikeCount = async (postId: string) => {
    try {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
      if (typeof count === 'number') setLiveLikes(count)
    } catch {
      setLiveLikes(null)
    }
  }

  useEffect(() => {
    // Simulate old internet: random sorting by default
    const shuffled = [...posts].sort(() => Math.random() - 0.5);
    setDisplayedCards(shuffled);
  }, [posts]);

  const { signOut, isAuthenticated, user } = useAuth();

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

  const handleCommentSubmit = async () => {
    if (!isAuthenticated) {
      setAuthModalAction('comment on posts');
      setShowAuthModal(true);
      return;
    }
    await handleComment();
    if (selectedCard) {
      await loadComments(selectedCard.id);
    }
  };

  const handleCardClick = (card: MediaCard) => {
    // record a unique view for signed-in users via Better Auth user id
    (async () => {
      try {
        if (user?.id) {
          await supabase.from('views').upsert({ post_id: card.id, user_id: user.id }, { onConflict: 'post_id,user_id' })
          // refresh live count after upsert
          fetchViewCount(card.id)
        }
      } catch {}
    })()
    if (card.type === 'music') {
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

  // Fetch live unique views for the modal
  useEffect(() => {
    if (!showDetailModal || !selectedCard) { setLiveViews(null); return }
    fetchViewCount(selectedCard.id)
    fetchLikeCount(selectedCard.id)
    loadComments(selectedCard.id)
  }, [showDetailModal, selectedCard?.id])

  const handlePortfolioClick = (creator: string) => {
    // Navigate to profile page (in real app, this would be /profile/[username])
    router.push('/profile');
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

  const handleSort = (mode: 'random' | 'newest' | 'curated') => {
    console.log('Sorting by:', mode); // Debug log
    setSortMode(mode);
    let sorted: MediaCard[];
    
    switch (mode) {
      case 'random':
        sorted = [...posts].sort(() => Math.random() - 0.5);
        break;
      case 'newest':
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
      <SiteHeader active="feed" />

      {/* Old Internet Controls */}
      <div className="max-w-7xl mx-auto px-4 py-4 border-b border-gray-200">
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
          {displayedCards.map((card) => (
            <div
              key={card.id}
              className="break-inside-avoid mb-4 group cursor-pointer"
            >
                              {/* Floating Media Card - No card background */}
                <div 
                  className={`relative ${getAspectRatioClass(card.aspectRatio)} overflow-hidden cursor-pointer`}
                  onClick={() => handleCardClick(card)}
                >
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
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
                            <p className="text-sm font-['Space_Mono'] text-black">
                              {card.title}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePortfolioClick(card.creator);
                              }}
                              className="font-['Space_Mono'] text-blue-600 hover:text-blue-800 transition-colors line-clamp-1"
                              title={card.creator}
                            >
                              {card.creator}
                            </button>
                            <div className="flex items-center space-x-2">
                              <span className="font-['Space_Mono']">{new Date(card.date).toLocaleDateString()}</span>
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
                          </div>
                          
                          {showStats && (
                            <div className="text-xs text-gray-500 font-['Space_Mono']">
                              {card.views} views
                            </div>
                          )}
                        </div>
            </div>
          ))}
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
      {showDetailModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                    {new Date(selectedCard.date).toLocaleDateString()} • {(liveViews !== null ? liveViews : selectedCard.views)} views
                  </div>
                  
                  {/* Work Description */}
                  <div className="mb-4">
                    <h3 className="text-sm font-['Space_Mono'] font-medium text-black mb-2">
                      About this work
                    </h3>
                    <div className="text-sm font-['Space_Mono'] text-gray-700 leading-relaxed">
                      {selectedCard.title === 'Synth Experiment #1' && (
                        'An experimental electronic composition exploring ambient textures and modular synthesis techniques.'
                      )}
                      {selectedCard.title === 'Acoustic Session' && (
                        'A warm acoustic guitar piece recorded in a cozy studio setting with natural reverb.'
                      )}
                      {selectedCard.title === 'Ambient Drift' && (
                        'A meditative ambient track featuring ethereal pads and subtle field recordings.'
                      )}
                      {selectedCard.title === 'Classical Art Piece' && (
                        'A classical painting inspired by Renaissance masters, exploring themes of beauty and tradition.'
                      )}
                      {selectedCard.title === 'Urban Photography' && (
                        'Street photography capturing the dynamic energy and architectural beauty of city life.'
                      )}
                      {selectedCard.title === 'Digital Art' && (
                        'Digital illustration blending traditional art techniques with modern digital tools.'
                      )}
                      {selectedCard.title === 'Street Photography' && (
                        'Candid street photography documenting everyday moments and urban culture.'
                      )}
                      {selectedCard.title === 'Abstract Composition' && (
                        'Abstract artwork exploring color theory and geometric forms through mixed media.'
                      )}
                      {!['Synth Experiment #1', 'Acoustic Session', 'Ambient Drift', 'Classical Art Piece', 'Urban Photography', 'Digital Art', 'Street Photography', 'Abstract Composition'].includes(selectedCard.title) && (
                        'Description not available for this work.'
                      )}
                    </div>
                  </div>
                  
                  {/* Like Button */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <button 
                      onClick={() => { if (selectedCard) { handleLikeClick(selectedCard.id); fetchLikeCount(selectedCard.id) } }}
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
                        {selectedCard && likedCards.has(selectedCard.id) ? 'Liked' : 'Like'} ({liveLikes ?? 0})
                      </span>
                    </button>
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
                        onKeyDown={(e) => {
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
                    
                    <div className="space-y-3">
                      {(commentsByPost[selectedCard.id] || []).length === 0 ? (
                        <div className="text-sm font-['Space_Mono'] text-gray-500">No comments yet. Be the first to comment!</div>
                      ) : (
                        (commentsByPost[selectedCard.id] || []).map(c => (
                          <div key={c.id} className="text-sm font-['Space_Mono'] text-black">
                            {c.content}
                            <span className="ml-2 text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action={authModalAction}
      />

    </div>
  );
} 