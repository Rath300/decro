'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  onUpload: () => void
  onPitch: () => void
}

export default function PitchChrome({ onUpload, onPitch }: Props) {
  const pathname = usePathname() || '/'
  const isWeb = pathname === '/'
  const isStandard = pathname === '/feed' || pathname.startsWith('/feed/')

  return (
    <header className="fixed top-0 inset-x-0 z-[60] h-14 border-b border-black bg-white flex items-center justify-between px-3 sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onPitch}
          className="inline-flex items-center shrink-0"
          aria-label="Decro"
        >
          <Image
            src="/decky.png"
            alt="Decro logo"
            width={36}
            height={36}
            className="sm:w-10 sm:h-10"
            priority
          />
        </button>

        <div className="flex items-center border border-black">
          <Link
            href="/"
            className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-['Space_Mono'] uppercase tracking-wide ${
              isWeb ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
          >
            Web view
          </Link>
          <Link
            href="/feed"
            className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-['Space_Mono'] uppercase tracking-wide border-l border-black ${
              isStandard ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
            }`}
          >
            Standard view
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onPitch}
          className="hidden sm:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
        >
          Pitch
        </button>
        {isWeb && (
          <button
            type="button"
            onClick={onUpload}
            className="border border-black bg-black text-white px-3 sm:px-4 py-1.5 text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
          >
            Upload
          </button>
        )}
      </div>
    </header>
  )
}
