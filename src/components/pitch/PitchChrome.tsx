'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import PitchGroupSearch from '@/components/pitch/PitchGroupSearch'

type Props = {
  onUpload: () => void
  /** Duck — return to / reset the web to main groups (no tour). */
  onHome: () => void
  /** Restart the interactive tutorial. */
  onTutorial: () => void
}

export default function PitchChrome({ onUpload, onHome, onTutorial }: Props) {
  const { isAuthenticated, signOut, loading } = useAuth()

  return (
    <header className="fixed top-0 inset-x-0 z-[60] h-14 border-b border-black bg-white flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
      <button
        type="button"
        onClick={onHome}
        className="inline-flex items-center shrink-0"
        aria-label="Reset web to main groups"
        title="Home — main groups"
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

      <PitchGroupSearch />

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        <button
          type="button"
          onClick={onTutorial}
          className="hidden md:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
        >
          Tutorial
        </button>
        {isAuthenticated && (
          <>
            <Link
              href="/subgroup/create"
              className="hidden sm:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
            >
              New group
            </Link>
            <Link
              href="/profile"
              className="text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
            >
              Profile
            </Link>
          </>
        )}
        {!loading &&
          (isAuthenticated ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="hidden sm:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
            >
              Log out
            </button>
          ) : (
            <Link
              href="/login"
              className="text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
            >
              Log in
            </Link>
          ))}
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
