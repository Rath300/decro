'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import { PostStats } from '@/components/post-stats'
import { isPitchMode } from '@/lib/pitch-mode'

export default function CardGrid({ cards }: { cards: MediaCard[] }) {
  const { setSelectedCard, setShowDetailModal, trackView, playingAudio, setPlayingAudio, likedCards, toggleLike } = usePosts()
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const router = useRouter()
  const pitchMode = isPitchMode()
  
  // Validate cards prop
  if (!Array.isArray(cards)) {
    console.error('CardGrid: cards prop must be an array')
    return null
  }

  const handleCardClick = (card: MediaCard) => {
    if (!card || !card.id) {
      console.error('Invalid card data')
      return
    }
    
    try {
      trackView(card.id)

      // Pitch: always use /post pages so chrome/back/duck navigation stay clear
      if (pitchMode || card.type === 'text') {
        router.push(`/post/${card.id}`)
        return
      }

      setSelectedCard(card)
      setShowDetailModal(true)
    } catch (error) {
      console.error('Error handling card click:', error)
    }
  }

  const handleAudioPlay = (cardId: string, audioUrl: string) => {
    if (!cardId || !audioUrl) {
      console.error('Invalid audio parameters')
      return
    }
    
    try {
      if (playingAudio && playingAudio !== cardId) {
        const currentAudio = audioRefs.current[playingAudio]
        if (currentAudio) {
          currentAudio.pause()
          currentAudio.currentTime = 0
        }
      }
      if (!audioRefs.current[cardId]) {
        audioRefs.current[cardId] = new Audio(audioUrl)
      }
      const audio = audioRefs.current[cardId]
      if (playingAudio === cardId) {
        audio.pause()
        audio.currentTime = 0
        setPlayingAudio(null)
      } else {
        audio.play()
        setPlayingAudio(cardId)
        audio.onended = () => setPlayingAudio(null)
      }
    } catch (error) {
      console.error('Error playing audio:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.filter(card => card && card.id).map((card) => (
        <div key={card.id} className="group cursor-pointer" onClick={() => handleCardClick(card)}>
          <div className="relative aspect-square overflow-hidden">
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
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center"><span class="text-gray-500 text-sm">Image unavailable</span></div>';
                  }
                }}
              />
            )}
            {card.type === 'music' && card.audioUrl && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleAudioPlay(card.id, card.audioUrl!) }}
                className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-70 rounded-full flex items-center justify-center text-white"
                aria-label="Play audio"
              >
                {playingAudio === card.id ? '■' : '▶'}
              </button>
            )}
          </div>
          {card.title && (
            <p className="mt-2 text-sm font-['Space_Mono'] text-black line-clamp-1">{card.title}</p>
          )}
          {card.description && (
            <p className="mt-1 text-xs text-gray-600 line-clamp-2">{card.description}</p>
          )}
          {/* Username and Subgroup */}
          {card.creator && (
            <div className="mt-1">
              <a 
                href={`/profile/${card.creator}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 font-normal hover:text-blue-800 transition-colors"
              >
                by {card.creator}
              </a>
              {card.subgroupName && (
                <p className="text-[10px] text-gray-500 font-normal">
                  in {card.subgroupName}
                </p>
              )}
            </div>
          )}
          <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike(card.id) }}
              className={`p-1 rounded-full transition-all duration-200 ${
                likedCards.has(card.id)
                  ? 'bg-red-50 text-red-500'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Like"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill={likedCards.has(card.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="transition-all duration-200">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <div onClick={(e) => e.stopPropagation()}>
              <PostStats postId={card.id} initialViews={card.views} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


