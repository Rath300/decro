/**
 * QuickCreate Component
 * Tumblr-inspired quick content creation
 * Brutalist design with direct content type selection
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ContentType {
  id: string
  label: string
  icon: string
  color: string
}

const contentTypes: ContentType[] = [
  { id: 'image', label: 'Image', icon: '📷', color: 'bg-white' },
  { id: 'music', label: 'Music', icon: '🎵', color: 'bg-white' },
  { id: 'video', label: 'Video', icon: '🎬', color: 'bg-white' },
  { id: 'text', label: 'Text', icon: 'Aa', color: 'bg-white' },
  { id: 'physical-art', label: 'Art', icon: '🎨', color: 'bg-white' },
]

export default function QuickCreate() {
  const router = useRouter()
  const [hoveredType, setHoveredType] = useState<string | null>(null)

  const handleCreate = (contentType: string) => {
    // Navigate to create page with pre-selected content type
    router.push(`/create?type=${contentType}`)
  }

  return (
    <div className="bg-white border-2 border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-['Space_Mono']">Create Something</h2>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        {contentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => handleCreate(type.id)}
            onMouseEnter={() => setHoveredType(type.id)}
            onMouseLeave={() => setHoveredType(null)}
            className={`
              relative
              aspect-square
              border-2 border-black
              ${type.color}
              hover:bg-black hover:text-white
              transition-all duration-150
              active:translate-y-[2px]
              flex flex-col items-center justify-center
              gap-1
              group
            `}
          >
            <div className="text-3xl group-hover:scale-110 transition-transform">
              {type.icon}
            </div>
            <div className="text-xs font-['Space_Mono'] font-bold">
              {type.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
