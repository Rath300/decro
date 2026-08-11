'use client'

import Link from 'next/link'
import { isPitchMode } from '@/lib/pitch-mode'

export default function ForgotPasswordPage() {
  const pitchMode = isPitchMode()

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black p-6 sm:p-8">
        <Link
          href="/login"
          className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
        >
          ← Log in
        </Link>

        <p className="text-[10px] uppercase tracking-wide text-black/40">
          Account
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-normal uppercase tracking-tight">
          Forgot password
        </h1>
        <p className="mt-3 text-sm text-black/60 leading-relaxed">
          Email password reset isn&apos;t set up yet. Guests can still use the
          site without an account.
        </p>
        <p className="mt-4 text-sm text-black/60 leading-relaxed">
          Locked out of a named account? Email{' '}
          <a
            href="mailto:hello@decro.net?subject=Password%20help"
            className="text-black underline underline-offset-4"
          >
            hello@decro.net
          </a>{' '}
          with your username and we&apos;ll help.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="border border-black bg-black text-white px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black"
          >
            Back to log in
          </Link>
          <Link
            href={pitchMode ? '/' : '/feed'}
            className="border border-black px-5 py-2.5 text-xs uppercase tracking-wide hover:bg-black hover:text-white"
          >
            {pitchMode ? 'Creative web' : 'Home'}
          </Link>
        </div>
      </div>
    </div>
  )
}
