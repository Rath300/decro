'use client'

import Image from 'next/image'

type Props = {
  onUpload: () => void
  onPitch: () => void
}

export default function PitchChrome({ onUpload, onPitch }: Props) {
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
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onPitch}
          className="hidden sm:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
        >
          Pitch
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="border border-black bg-black text-white px-3 sm:px-4 py-1.5 text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
        >
          Upload
        </button>
      </div>
    </header>
  )
}
