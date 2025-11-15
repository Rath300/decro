'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Identity from '@/components/Identity'

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-14 py-2 border border-black -mb-px text-sm transition-transform duration-150 active:translate-y-[1px] ${
        active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  )
}

export default function AppHeader() {
  const pathname = usePathname() || '/feed'

  const isFeed = pathname === '/' || pathname.startsWith('/feed')
  const isSpotlight = pathname.startsWith('/spotlight')
  const isSubgroup = pathname.startsWith('/subgroup')
  const isProfile = pathname.startsWith('/profile')

  return (
    <div className="fixed top-0 left-0 right-0 bg-white z-40">
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <Link href="/feed" className="flex items-center gap-2">
              <Image
                src="/decky.png"
                alt="Decro logo"
                width={32}
                height={32}
                priority
              />
            </Link>
            <div className="flex items-end gap-2">
              <Tab href="/feed" label="Feed" active={isFeed} />
              <Tab href="/spotlight" label="Spotlight" active={isSpotlight} />
              <Tab href="/subgroup" label="Subgroup" active={isSubgroup} />
              <Tab href="/profile" label="Profile" active={isProfile} />
            </div>
          </div>
          <div className="flex items-center gap-4 leading-6 font-['Space_Mono']">
            <Link href="/create" className="inline-flex items-center justify-center w-8 h-8 bg-black text-white border border-black">
              +
            </Link>
            <Identity />
          </div>
        </div>
        {/* Mask any legacy page-level dividers directly under the header */}
        <div className="absolute left-0 right-0 top-full h-[25px] bg-white" />
      </div>
    </div>
  )
}


