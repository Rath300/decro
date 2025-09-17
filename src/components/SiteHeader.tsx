'use client'

import Link from 'next/link'

export default function SiteHeader({ active }: { active?: 'feed' | 'explore' | 'profile' }) {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/feed" className="font-['Space_Mono'] text-lg text-black">Decro</Link>
        <nav className="flex items-center gap-4">
          <Link href="/feed" className={`font-['Space_Mono'] text-sm ${active==='feed'?'text-black':'text-gray-600 hover:text-black'}`}>Feed</Link>
          <Link href="/subgroup" className={`font-['Space_Mono'] text-sm ${active==='explore'?'text-black':'text-gray-600 hover:text-black'}`}>Subgroup</Link>
          <Link href="/create" className="inline-flex items-center justify-center w-8 h-8 bg-black text-white">+</Link>
        </nav>
      </div>
    </header>
  )
}



