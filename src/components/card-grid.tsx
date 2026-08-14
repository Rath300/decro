'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePosts } from '@/context/post-context'
import type { MediaCard } from '@/context/post-context'
import { PostStats } from '@/components/post-stats'
import { isPitchMode } from '@/lib/pitch-mode'
import { seedPostOpen } from '@/lib/pitch-nav'

export default function CardGrid({ cards }: { cards: MediaCard[] }) {
  const {
    setSelectedCard,
    setShowDetailModal,
    trackView,
    playingAudio,
    setPlayingAudio,
  } = usePosts()
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const router = useRouter()
  const pitchMode = isPitchMode()

  if (!Array.isArray(cards)) {
    console.error('CardGrid: cards prop must be an array')
    return null
  }

  const openPost = (card: MediaCard) => {
    seedPostOpen({
      id: card.id,
      title: card.title || 'Untitled',
      description: card.description,
      content_type: card.type,
      media_url: card.imageUrl,
      audio_url: card.audioUrl,
      video_url: card.videoUrl,
      created_at: card.date,
      views: card.views,
      creator_username: card.creator,
      subgroup_name: card.subgroupName,
      subgroup_slug: card.subgroupSlug,
      subgroup_id: card.subgroupId,
    })
    router.push(`/post/${card.id}`)
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
        openPost(card)
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
    <div
      className={
        pitchMode
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-l border-black'
          : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
      }
    >
      {cards
        .filter((card) => card && card.id)
        .map((card) => (
          <div
            key={card.id}
            className={
              pitchMode
                ? 'group cursor-pointer border-r border-b border-black p-3 hover:bg-black/[0.02]'
                : 'group cursor-pointer'
            }
            onClick={() => handleCardClick(card)}
            onMouseEnter={() => {
              if (pitchMode) router.prefetch(`/post/${card.id}`)
            }}
          >
            <div
              className={
                pitchMode
                  ? 'relative aspect-[4/3] overflow-hidden border border-black bg-white'
                  : 'relative aspect-square overflow-hidden'
              }
            >
              {!card.imageUrl || card.type === 'text' ? (
                <div className="w-full h-full bg-white flex flex-col justify-between p-4 text-left">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-black/40">
                      {card.description && /ubu\.com|ubuweb/i.test(card.description)
                        ? 'Archive link'
                        : 'Text'}
                    </p>
                    <h4 className="mt-2 text-sm font-['Space_Mono'] uppercase text-black line-clamp-3">
                      {card.title || 'Post'}
                    </h4>
                    {card.description && (
                      <p className="mt-2 text-xs text-black/50 line-clamp-4 whitespace-pre-wrap">
                        {card.description
                          .split('\n')
                          .filter((l) => !/^open on ubuweb:/i.test(l.trim()))
                          .join('\n')
                          .trim()}
                      </p>
                    )}
                  </div>
                  {card.description && /ubu\.com|ubuweb/i.test(card.description) ? (
                    <p className="mt-3 text-[10px] uppercase tracking-wide text-black">
                      Open on UbuWeb →
                    </p>
                  ) : null}
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              {card.type === 'music' && card.audioUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAudioPlay(card.id, card.audioUrl!)
                  }}
                  className="absolute top-2 right-2 border border-black bg-white px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-black hover:text-white"
                  aria-label="Play audio"
                >
                  {playingAudio === card.id ? 'Stop' : 'Play'}
                </button>
              )}
            </div>
            {card.title && (
              <p className="mt-2 text-xs font-['Space_Mono'] uppercase tracking-wide text-black line-clamp-2">
                {card.title}
              </p>
            )}
            {card.creator && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-black/40">
                {card.creator}
                {card.subgroupName ? ` · ${card.subgroupName}` : ''}
              </p>
            )}
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <PostStats postId={card.id} initialViews={card.views} />
            </div>
          </div>
        ))}
    </div>
  )
}
