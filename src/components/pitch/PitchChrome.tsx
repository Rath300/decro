'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  return (
    <header className="fixed top-0 inset-x-0 z-[60] h-14 border-b border-black bg-white flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
      <button
        type="button"
        data-tour="duck"
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

      <div data-tour="search" className="min-w-0 flex-1 max-w-xs sm:max-w-sm">
        <PitchGroupSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        <button
          type="button"
          data-tour="tutorial"
          onClick={onTutorial}
          className="hidden md:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
        >
          Tutorial
        </button>
        <Link
          href="/updates"
          className="hidden md:inline text-xs font-['Space_Mono'] uppercase underline underline-offset-4"
        >
          Updates
        </Link>
        {isAuthenticated && (
          <>
            <Link
              href="/subgroup/create"
              data-tour="new-group"
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
        {!isAuthenticated && (
          <span
            data-tour="new-group"
            className="hidden sm:inline text-xs font-['Space_Mono'] uppercase text-black/30"
            title="Create a group while uploading, or log in for New group"
          >
            New group
          </span>
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

        {/* Mobile overflow — Tutorial / New group / Log out */}
        <div className="relative sm:hidden" ref={menuRef}>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="border border-black px-2.5 py-1.5 text-xs font-['Space_Mono'] uppercase hover:bg-black hover:text-white"
          >
            Menu
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 border border-black bg-white min-w-[10rem] z-[70]">
              <button
                type="button"
                className="w-full text-left px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white border-b border-black"
                onClick={() => {
                  setMenuOpen(false)
                  onTutorial()
                }}
              >
                Tutorial
              </button>
              <Link
                href="/updates"
                className="block px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white border-b border-black"
                onClick={() => setMenuOpen(false)}
              >
                Updates
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/subgroup/create"
                    className="block px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white border-b border-black"
                    onClick={() => setMenuOpen(false)}
                  >
                    New group
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white border-b border-black"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white"
                    onClick={() => {
                      setMenuOpen(false)
                      void signOut()
                    }}
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <p className="px-3 py-2 text-[10px] uppercase tracking-wide text-black/40 border-b border-black">
                    New group via Upload
                  </p>
                  <Link
                    href="/login"
                    className="block px-3 py-2.5 text-[10px] uppercase tracking-wide font-['Space_Mono'] hover:bg-black hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          data-tour="upload"
          onClick={onUpload}
          className="border border-black bg-black text-white px-3 sm:px-4 py-1.5 text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
        >
          Upload
        </button>
      </div>
    </header>
  )
}
