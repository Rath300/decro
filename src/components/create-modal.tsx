'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon } from '@/components/NavIcons'

interface CreateOption {
  type: 'text' | 'photo' | 'quote' | 'link' | 'chat' | 'audio' | 'video'
  label: string
  icon: string
}

const CREATE_OPTIONS: CreateOption[] = [
  { type: 'text', label: 'Text', icon: 'Aa' },
  { type: 'photo', label: 'Photo', icon: '📷' },
  { type: 'quote', label: 'Quote', icon: '❝' },
  { type: 'link', label: 'Link', icon: '🔗' },
  { type: 'chat', label: 'Chat', icon: 'hi!' },
  { type: 'audio', label: 'Audio', icon: '🎧' },
  { type: 'video', label: 'Video', icon: '🎬' },
]

export function CreateModal() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleCreate = (type: string) => {
    setIsOpen(false)
    router.push(`/create?type=${type}`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 sm:px-4 md:px-8 lg:px-14 py-2 border border-black -mb-px text-xs sm:text-sm font-['Space_Mono'] leading-6 transition-all duration-150 active:translate-y-[1px] bg-white text-black hover:bg-gray-50"
      >
        <span className="hidden sm:inline">Create</span>
        <span className="sm:hidden flex items-center justify-center"><PlusIcon /></span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50"
            >
              <div className="p-2">
                {CREATE_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleCreate(option.type)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 transition-colors font-['Space_Mono'] text-left"
                  >
                    <span className="text-xl w-8 text-center">{option.icon}</span>
                    <span className="text-sm font-medium">{option.label}</span>
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
