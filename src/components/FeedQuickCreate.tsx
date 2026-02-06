'use client'

import { useRouter } from 'next/navigation'

interface CreateOption {
  type: 'text' | 'photo' | 'quote' | 'link' | 'chat' | 'audio' | 'video'
  label: string
  icon: string
  bgColor: string
  textColor: string
}

const CREATE_OPTIONS: CreateOption[] = [
  { type: 'text', label: 'Text', icon: 'Aa', bgColor: '#000000', textColor: '#ffffff' },
  { type: 'photo', label: 'Photo', icon: '📷', bgColor: '#FF4D4D', textColor: '#000000' },
  { type: 'quote', label: 'Quote', icon: '❝', bgColor: '#FF8C42', textColor: '#000000' },
  { type: 'link', label: 'Link', icon: '🔗', bgColor: '#4CAF50', textColor: '#ffffff' },
  { type: 'chat', label: 'Chat', icon: 'hi!', bgColor: '#5DADE2', textColor: '#ffffff' },
  { type: 'audio', label: 'Audio', icon: '🎧', bgColor: '#9B59B6', textColor: '#ffffff' },
  { type: 'video', label: 'Video', icon: '🎬', bgColor: '#E91E63', textColor: '#ffffff' },
]

export default function FeedQuickCreate() {
  const router = useRouter()

  const handleCreate = (type: string) => {
    router.push(`/create?type=${type}`)
  }

  return (
    <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
      <div className="p-4">
        <div className="flex gap-2 overflow-x-auto">
          {CREATE_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => handleCreate(option.type)}
              className="flex-shrink-0 flex flex-col items-center gap-2 p-3 border-2 border-black hover:translate-y-[-2px] transition-all duration-150 active:translate-y-[1px] min-w-[90px]"
              style={{ borderColor: option.bgColor }}
            >
              <div 
                className="text-2xl w-12 h-12 flex items-center justify-center border-2 border-black font-['Space_Mono'] font-bold"
                style={{ 
                  backgroundColor: option.bgColor,
                  color: option.textColor
                }}
              >
                {option.icon}
              </div>
              <span className="font-['Space_Mono'] text-xs font-bold text-black">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
