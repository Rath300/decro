'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Identity from '@/components/Identity'
import { NotificationsDropdown } from '@/components/notifications-dropdown'
import { MessagesDropdown } from '@/components/messages-dropdown'
import { CreateModal } from '@/components/create-modal'

function Tab({ href, label, active, shortLabel }: { href: string; label: string; active: boolean; shortLabel?: string }) {
  return (
    <Link
      href={href}
      className={`px-2 sm:px-4 md:px-8 lg:px-14 py-2 border border-black -mb-px text-xs sm:text-sm font-['Space_Mono'] leading-6 transition-all duration-150 active:translate-y-[1px] ${
        active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
      }`}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel || label}</span>
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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between py-2">
          <div className="flex items-center gap-1 sm:gap-4">
            <Link href="/feed" className="inline-flex items-center">
              <Image
                src="/decky.png"
                alt="Decro logo"
                width={32}
                height={32}
                className="sm:w-10 sm:h-10"
                priority
              />
            </Link>
            <div className="flex items-end gap-0.5 sm:gap-2">
              <Tab href="/feed" label="Feed" shortLabel="Feed" active={isFeed} />
              <Tab href="/spotlight" label="Spotlight" shortLabel="Spot" active={isSpotlight} />
              <Tab href="/subgroup" label="Subgroup" shortLabel="Sub" active={isSubgroup} />
              <Tab href="/profile" label="Profile" shortLabel="Pro" active={isProfile} />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <CreateModal />
            <div className="flex items-center gap-0.5 sm:gap-1">
              <MessagesDropdown />
              <NotificationsDropdown />
            </div>
            <div className="hidden sm:block">
              <Identity />
            </div>
          </div>
        </div>
        {/* Mask any legacy page-level dividers directly under the header */}
        <div className="absolute left-0 right-0 top-full h-[25px] bg-white" />
      </div>
    </div>
  )
}


