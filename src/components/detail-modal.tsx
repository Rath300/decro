'use client'

import { usePosts } from '@/context/post-context'

export default function DetailModal() {
  const { showDetailModal, setShowDetailModal, selectedCard } = usePosts()

  if (!showDetailModal || !selectedCard) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-['Space_Mono'] font-bold text-black">{selectedCard.title}</h2>
          <button onClick={() => setShowDetailModal(false)} aria-label="Close" className="text-gray-500 hover:text-black">✕</button>
        </div>
        <div className="p-4">
          {['video', 'film'].includes(selectedCard.type) && selectedCard.videoUrl ? (
            <video src={selectedCard.videoUrl} controls className="w-full h-auto rounded" />
          ) : (
            <img src={selectedCard.imageUrl} alt={selectedCard.title} className="w-full h-auto rounded" />
          )}
        </div>
      </div>
    </div>
  )
}


