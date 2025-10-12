'use client'

import { useRef } from 'react'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'

export default function CardGrid({ cards }: { cards: MediaCard[] }) {
  const { setSelectedCard, setShowDetailModal, trackView, playingAudio, setPlayingAudio } = usePosts()
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const handleCardClick = (card: MediaCard) => {
    trackView(card.id)
    setSelectedCard(card)
    setShowDetailModal(true)
  }

  const handleAudioPlay = (cardId: string, audioUrl: string) => {
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
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.id} className="group cursor-pointer" onClick={() => handleCardClick(card)}>
          <div className="relative aspect-square overflow-hidden">
            <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
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
        </div>
      ))}
    </div>
  )
}


