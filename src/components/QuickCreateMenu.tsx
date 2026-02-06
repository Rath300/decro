'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface CreateOption {
  type: 'text' | 'photo' | 'quote' | 'link' | 'chat' | 'audio' | 'video'
  label: string
  icon: string
  color: string
}

const CREATE_OPTIONS: CreateOption[] = [
  { type: 'text', label: 'Text', icon: 'Aa', color: '#000' },
  { type: 'photo', label: 'Photo', icon: '📷', color: '#FF4D4D' },
  { type: 'quote', label: 'Quote', icon: '❝', color: '#FF8C42' },
  { type: 'link', label: 'Link', icon: '🔗', color: '#4CAF50' },
  { type: 'chat', label: 'Chat', icon: 'hi!', color: '#5DADE2' },
  { type: 'audio', label: 'Audio', icon: '🎧', color: '#9B59B6' },
  { type: 'video', label: 'Video', icon: '🎬', color: '#E91E63' },
]

export default function QuickCreateMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleCreate = (type: string) => {
    // Navigate to create page with the selected type
    router.push(`/create?type=${type}`)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Main CREATE button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-8 py-3 bg-black text-white border-2 border-black font-['Space_Mono'] font-bold text-lg hover:bg-gray-900 transition-all duration-150 active:translate-y-[1px]"
      >
        CREATE
      </button>

      {/* Quick create menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50"
            >
              <div className="p-4 flex gap-2">
                {CREATE_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleCreate(option.type)}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-black hover:bg-gray-50 transition-all duration-150 active:translate-y-[1px] min-w-[100px]"
                    style={{ borderColor: option.color }}
                  >
                    <div 
                      className="text-3xl w-14 h-14 flex items-center justify-center border-2 border-black"
                      style={{ 
                        backgroundColor: option.color,
                        color: option.type === 'text' || option.type === 'chat' ? '#fff' : '#000'
                      }}
                    >
                      {option.icon}
                    </div>
                    <span className="font-['Space_Mono'] text-sm font-bold">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
