'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import AuthModal from './auth-modal';
import SiteHeader from './SiteHeader'

interface UserWork {
  id: string;
  type: 'music' | 'painting' | 'drawing' | 'image';
  title: string;
  imageUrl: string;
  aspectRatio: 'square' | 'portrait' | 'landscape';
  audioUrl?: string;
  date: string;
  isCurated?: boolean;
  views: number;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  profession: string;
  bio: string;
  profileImage: string;
  followers: number;
  following: number;
  location: string;
  works: UserWork[];
}

// Mock current user profile
const currentUserProfile: UserProfile = {
  id: '1',
  username: 'joshua_koshy',
  displayName: 'Joshua Koshy',
  profession: 'Musician & Producer',
  bio: 'Creating ambient soundscapes and experimental electronic music. Based in Brooklyn, NY. Always exploring new sonic territories.',
  profileImage: '/guylooking.png',
  followers: 1247,
  following: 89,
  location: 'Brooklyn, NY',
  works: [
    {
      id: '1',
      type: 'music',
      title: 'Synth Experiment #1',
      imageUrl: '/image.png',
      aspectRatio: 'square',
      audioUrl: '/synth.wav',
      date: '2024-01-15',
      isCurated: true,
      views: 127
    },
    {
      id: '2',
      type: 'music',
      title: 'Acoustic Session',
      imageUrl: '/sunshine.png',
      aspectRatio: 'square',
      audioUrl: '/acoustic-guitar-loop-f-91bpm-132687.mp3',
      date: '2024-01-14',
      views: 89
    },
    {
      id: '3',
      type: 'music',
      title: 'Ambient Drift',
      imageUrl: '/warmvibes.png',
      aspectRatio: 'square',
      audioUrl: '/mouse-squeaks-68287.mp3',
      date: '2024-01-13',
      views: 203
    },
    {
      id: '4',
      type: 'image',
      title: 'Studio Setup',
      imageUrl: '/mountain.png',
      aspectRatio: 'portrait',
      date: '2024-01-12',
      views: 156
    },
    {
      id: '5',
      type: 'image',
      title: 'Late Night Session',
      imageUrl: '/bmw.png',
      aspectRatio: 'landscape',
      date: '2024-01-11',
      views: 342
    },
    {
      id: '6',
      type: 'image',
      title: 'Creative Process',
      imageUrl: '/shwarma.png',
      aspectRatio: 'square',
      date: '2024-01-10',
      views: 78
    }
  ]
};

export default function ProfilePage() {
  const router = useRouter();
  const { signOut, isAuthenticated, user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<UserWork | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Check if user is authenticated when viewing their own profile
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  const handleCardClick = (work: UserWork) => {
    if (work.type === 'music') {
      // For music, play audio
      handleAudioPlay(work.id, work.audioUrl!);
    } else {
      // For images, show detail modal
      setSelectedCard(work);
      setShowDetailModal(true);
    }
  };

  const handleAudioPlay = (audioId: string, audioUrl: string) => {
    if (playingAudio === audioId) {
      // Stop current audio
      if (audioRefs.current[audioId]) {
        audioRefs.current[audioId]?.pause();
        audioRefs.current[audioId]!.currentTime = 0;
      }
      setPlayingAudio(null);
    } else {
      // Stop any currently playing audio
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio]?.pause();
        audioRefs.current[playingAudio]!.currentTime = 0;
      }
      
      // Play new audio
      if (audioRefs.current[audioId]) {
        audioRefs.current[audioId]?.play();
        setPlayingAudio(audioId);
      }
    }
  };

  const AudioWaveform = ({ isPlaying }: { isPlaying: boolean }) => (
    <div className="flex items-center justify-center space-x-1 h-8">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-white transition-all duration-300 ${
            isPlaying 
              ? 'animate-pulse' 
              : ''
          }`}
          style={{
            height: isPlaying 
              ? `${Math.random() * 20 + 8}px` 
              : '8px',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );

  const CuratedBadge = () => (
    <div className="absolute top-2 left-2 bg-yellow-400 text-black px-2 py-1 text-xs font-['Space_Mono'] font-bold border border-black">
      CURATED
    </div>
  );

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

  const filters = [
    { id: 'all', label: 'All Works' },
    { id: 'music', label: 'Music' },
    { id: 'image', label: 'Images' },
    { id: 'painting', label: 'Paintings' },
    { id: 'drawing', label: 'Drawings' }
  ];

  const filteredWorks = activeFilter === 'all' 
    ? currentUserProfile.works 
    : currentUserProfile.works.filter(work => work.type === activeFilter);

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="profile" />

      {/* Profile Banner */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Profile Image */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 flex-shrink-0">
              <img
                src={currentUserProfile.profileImage}
                alt={currentUserProfile.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Profile Info */}
            <div className="flex-1">
              <div className="mb-4">
                <h1 className="text-3xl font-['Space_Mono'] font-bold text-black mb-1">
                  {currentUserProfile.displayName}
                </h1>
                <p className="text-lg font-['Space_Mono'] text-gray-600 mb-2">
                  @{currentUserProfile.username}
                </p>
                <p className="text-sm font-['Space_Mono'] text-gray-700 mb-3">
                  {currentUserProfile.profession} • {currentUserProfile.location}
                </p>
                <p className="text-sm font-['Space_Mono'] text-gray-700 leading-relaxed">
                  {currentUserProfile.bio}
                </p>
              </div>
              
              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm font-['Space_Mono'] text-gray-600">
                <span>{currentUserProfile.works.length} works</span>
                <span>{currentUserProfile.followers} followers</span>
                <span>{currentUserProfile.following} following</span>
              </div>
            </div>
            
            {/* Edit Profile Button */}
            <div className="flex-shrink-0">
              <button className="px-6 py-2 bg-black text-white font-['Space_Mono'] text-sm font-medium border border-black transition-all duration-150 active:transform active:scale-95 hover:bg-gray-800">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Content Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 text-sm font-['Space_Mono'] border border-black transition-colors ${
                  activeFilter === filter.id
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* User's Work Grid */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {filteredWorks.map((work) => (
            <div
              key={work.id}
              className="break-inside-avoid group cursor-pointer"
              onClick={() => handleCardClick(work)}
            >
              {/* Work Image */}
              <div className={`relative bg-gray-100 rounded-lg overflow-hidden mb-2 ${getAspectRatioClass(work.aspectRatio)}`}>
                <img
                  src={work.imageUrl}
                  alt={work.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Curated badge */}
                {work.isCurated && <CuratedBadge />}
                
                {/* Audio waveform overlay for music */}
                {work.type === 'music' && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {playingAudio === work.id ? (
                      <AudioWaveform isPlaying={true} />
                    ) : (
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 5v14l11-7z" fill="black"/>
                        </svg>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Work Info */}
              <div className="space-y-1">
                <p className="text-sm font-['Space_Mono'] text-black line-clamp-1">
                  {work.title}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="font-['Space_Mono']">{new Date(work.date).toLocaleDateString()}</span>
                  <span className="font-['Space_Mono']">{work.views} views</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* End of Profile Message */}
        <div className="mt-12 text-center border-t border-gray-200 pt-8">
          <p className="text-sm font-['Space_Mono'] text-gray-500">
            End of profile • {filteredWorks.length} works shown
          </p>
        </div>

        {/* Audio Elements */}
        {currentUserProfile.works
          .filter(work => work.type === 'music' && work.audioUrl)
          .map((work) => (
            <audio
              key={work.id}
              ref={(el) => {
                audioRefs.current[work.id] = el;
              }}
              src={work.audioUrl}
              onEnded={() => setPlayingAudio(null)}
            />
          ))
        }
      </div>

      {/* Detail Modal - Pinterest Style */}
      {showDetailModal && selectedCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col lg:flex-row">
              {/* Image Section */}
              <div className="lg:w-2/3 p-6">
                <div className="relative">
                  <img
                    src={selectedCard.imageUrl}
                    alt={selectedCard.title}
                    className="w-full h-auto rounded-lg"
                  />
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
                  <div className="text-sm font-['Space_Mono'] text-gray-600">
                    {new Date(selectedCard.date).toLocaleDateString()} • {selectedCard.views} views
                  </div>
                  
                  {/* Comments Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-['Space_Mono'] font-medium text-black mb-3">
                      Comments
                    </h3>
                    <div className="space-y-3">
                      <div className="text-sm font-['Space_Mono'] text-gray-500">
                        No comments yet. Be the first to comment!
                      </div>
                    </div>
                  </div>
                  
                  {/* Like Button */}
                  <button className="w-full py-2 bg-black text-white font-['Space_Mono'] text-sm font-medium border border-black transition-all duration-150 active:transform active:scale-95 hover:bg-gray-800">
                    ❤️ Like
                  </button>
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
        action="view your profile"
      />
    </div>
  );
} 