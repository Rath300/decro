'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import AuthModal from './auth-modal';
import SiteHeader from './SiteHeader'

interface PortfolioCard {
  id: string;
  name: string;
  profession: string;
  bio: string;
  profileImage: string;
  previewWorks: {
    id: string;
    title: string;
    imageUrl: string;
    type: 'image' | 'music' | 'video';
    audioUrl?: string;
  }[];
  followers: number;
  location: string;
}

const mockPortfolios: PortfolioCard[] = [
  {
    id: '1',
    name: 'Joshua Koshy',
    profession: 'Musician & Producer',
    bio: 'Creating ambient soundscapes and experimental electronic music. Based in Brooklyn, NY.',
    profileImage: '/guylooking.png',
    previewWorks: [
      {
        id: '1',
        title: 'Synth Experiment #1',
        imageUrl: '/image.png',
        type: 'music',
        audioUrl: '/synth.wav'
      },
      {
        id: '2',
        title: 'Acoustic Session',
        imageUrl: '/sunshine.png',
        type: 'music',
        audioUrl: '/acoustic-guitar-loop-f-91bpm-132687.mp3'
      },
      {
        id: '3',
        title: 'Ambient Drift',
        imageUrl: '/warmvibes.png',
        type: 'music',
        audioUrl: '/mouse-squeaks-68287.mp3'
      }
    ],
    followers: 1247,
    location: 'Brooklyn, NY'
  },
  {
    id: '2',
    name: 'Rishi Viduru',
    profession: 'Digital Artist',
    bio: 'Exploring the intersection of traditional art and digital media. Creating surreal landscapes and character designs.',
    profileImage: '/mountain.png',
    previewWorks: [
      {
        id: '4',
        title: 'Mountain Dreams',
        imageUrl: '/mountain.png',
        type: 'image'
      },
      {
        id: '5',
        title: 'Character Design',
        imageUrl: '/tumblr_ea02597654780f690c116d76d8b54241_2101b683_500.png',
        type: 'image'
      },
      {
        id: '6',
        title: 'Abstract Composition',
        imageUrl: '/birmingham-museums-trust-sJr8LDyEf7k-unsplash.jpg',
        type: 'image'
      }
    ],
    followers: 892,
    location: 'San Francisco, CA'
  },
  {
    id: '3',
    name: 'Ryley Prediction',
    profession: 'Street Photographer',
    bio: 'Capturing the raw energy of urban life through candid street photography and documentary work.',
    profileImage: '/motorcycleguy.png',
    previewWorks: [
      {
        id: '7',
        title: 'Urban Rider',
        imageUrl: '/motorcycleguy.png',
        type: 'image'
      },
      {
        id: '8',
        title: 'Street Life',
        imageUrl: '/jc-gellidon-xDsq3u3ZUqc-unsplash (1).jpg',
        type: 'image'
      },
      {
        id: '9',
        title: 'City Shadows',
        imageUrl: '/lucas-gouvea-aoEwuEH7YAs-unsplash.jpg',
        type: 'image'
      }
    ],
    followers: 2156,
    location: 'Los Angeles, CA'
  },
  {
    id: '4',
    name: 'Japan So Cool',
    profession: 'Travel Photographer',
    bio: 'Exploring the world through a lens, specializing in travel and cultural photography.',
    profileImage: '/shwarma.png',
    previewWorks: [
      {
        id: '10',
        title: 'Street Food',
        imageUrl: '/shwarma.png',
        type: 'image'
      },
      {
        id: '11',
        title: 'Classic Beauty',
        imageUrl: '/bmw.png',
        type: 'image'
      },
      {
        id: '12',
        title: 'Urban Photography',
        imageUrl: '/jc-gellidon-xDsq3u3ZUqc-unsplash (1).jpg',
        type: 'image'
      }
    ],
    followers: 3421,
    location: 'Tokyo, Japan'
  }
];

export default function PortfoliosPage() {
  const router = useRouter();
  const { signOut, isAuthenticated, user } = useAuth();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  const handleLogout = async () => {
    await signOut();
    router.push('/');
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
          className={`w-1 bg-black transition-all duration-300 ${
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

  return (
    <div className="min-h-screen bg-white font-['Space_Mono']">
      <SiteHeader active="portfolios" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-['Space_Mono'] font-bold text-black mb-2">
            Artist Portfolios
          </h2>
          <p className="text-sm font-['Space_Mono'] text-gray-600">
            Discover creative work from talented artists around the world
          </p>
        </div>

        {/* Portfolio Cards */}
        <div className="space-y-8">
          {mockPortfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                } else {
                  router.push('/profile');
                }
              }}
            >
              {/* Portfolio Card Content */}
              <div className="flex flex-col lg:flex-row">
                {/* Left Side - Profile Section */}
                <div className="lg:w-1/3 p-6 border-r border-gray-100">
                  <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                    {/* Profile Image */}
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-200">
                      <img
                        src={portfolio.profileImage}
                        alt={portfolio.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Name and Profession */}
                    <h3 className="text-xl font-['Space_Mono'] font-bold text-black mb-1">
                      {portfolio.name}
                    </h3>
                    <p className="text-sm font-['Space_Mono'] text-gray-600 mb-3">
                      {portfolio.profession}
                    </p>
                    
                    {/* Bio */}
                    <p className="text-sm font-['Space_Mono'] text-gray-700 mb-4 leading-relaxed">
                      {portfolio.bio}
                    </p>
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-4 text-xs font-['Space_Mono'] text-gray-500">
                      <span>{portfolio.followers} followers</span>
                      <span>•</span>
                      <span>{portfolio.location}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Work Preview */}
                <div className="lg:w-2/3 p-6">
                  <h4 className="text-sm font-['Space_Mono'] font-medium text-gray-600 mb-4 uppercase tracking-wide">
                    Recent Work
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {portfolio.previewWorks.map((work) => (
                      <div
                        key={work.id}
                        className="group cursor-pointer"
                        onClick={() => {
                          if (work.type === 'music' && work.audioUrl) {
                            handleAudioPlay(work.id, work.audioUrl);
                          }
                        }}
                      >
                        {/* Work Image */}
                        <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                          <img
                            src={work.imageUrl}
                            alt={work.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          
                          {/* Audio Play Button Overlay */}
                          {work.type === 'music' && (
                            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                                {playingAudio === work.id ? (
                                  <AudioWaveform isPlaying={true} />
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 5v14l11-7z" fill="black"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Work Title */}
                        <p className="text-xs font-['Space_Mono'] text-black line-clamp-1">
                          {work.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Audio Elements */}
        {mockPortfolios.map((portfolio) =>
          portfolio.previewWorks
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
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        action="view artist profiles"
      />
    </div>
  );
} 