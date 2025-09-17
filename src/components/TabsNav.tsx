'use client'

import Link from 'next/link'

type Props = { active?: 'feed' | 'spotlight' | 'subgroup' | 'profile' }

export default function TabsNav({ active }: Props) {
  const tabClasses = (isActive: boolean) =>
    `px-8 py-2 border border-black border-b-0 -mb-px text-sm leading-6 font-['Space_Mono'] ${
      isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
    }`

  return (
    <div className="w-full bg-white">
      {/* Top rule */}
      <div className="border-b border-black">
        <div className="max-w-7xl mx-auto px-4 flex items-end justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm leading-6 font-['Space_Mono'] text-black underline pr-2">Sign In</Link>
            <Link href="/feed" className={tabClasses(active === 'feed')}>Feed</Link>
            <Link href="/spotlight" className={tabClasses(active === 'spotlight')}>Spotlight</Link>
            <Link href="/subgroup" className={tabClasses(active === 'subgroup')}>Subgroup</Link>
            <Link href="/profile" className={tabClasses(active === 'profile')}>Profile</Link>
          </div>
          <div className="flex items-center gap-4 pb-2">
            <Link href="/create" className="inline-flex items-center justify-center w-8 h-8 bg-black text-white border border-black">+</Link>
          </div>
        </div>
      </div>
    </div>
  )
}


