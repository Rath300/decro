'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  PITCH_DISCORD_HANDLES,
  PITCH_EMAIL,
  PITCH_ENTER_CTA,
  PITCH_ONBOARDING_STEPS,
} from '@/lib/pitch-copy'

type Props = {
  onComplete: () => void
}

export default function PitchOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const total = PITCH_ONBOARDING_STEPS.length + 1 // + contact / enter
  const isLast = step >= PITCH_ONBOARDING_STEPS.length
  const current = !isLast ? PITCH_ONBOARDING_STEPS[step] : null

  return (
    <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center px-5 sm:px-8 py-20 overflow-y-auto">
      <div className="max-w-lg w-full my-auto">
        <Image
          src="/decky.png"
          alt="Decro"
          width={96}
          height={96}
          className="w-20 h-20 sm:w-24 sm:h-24"
          priority
        />

        <p className="mt-6 text-[10px] sm:text-xs font-['Space_Mono'] uppercase tracking-wide text-black/45">
          {step + 1} / {total}
        </p>

        {current ? (
          <div className="mt-3 space-y-3 font-['Space_Mono'] text-black">
            <h1 className="text-xl sm:text-2xl font-normal tracking-tight">
              {current.title}
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-black/80">
              {current.body}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3 font-['Space_Mono'] text-black">
            <h1 className="text-xl sm:text-2xl font-normal tracking-tight">
              Say hello
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-black/80">
              Feedback helps a lot. Email{' '}
              <a
                href={`mailto:${PITCH_EMAIL}`}
                className="underline underline-offset-2"
              >
                {PITCH_EMAIL}
              </a>{' '}
              or Discord{' '}
              <span className="underline underline-offset-2">
                {PITCH_DISCORD_HANDLES[0]}
              </span>{' '}
              /{' '}
              <span className="underline underline-offset-2">
                {PITCH_DISCORD_HANDLES[1]}
              </span>
              .
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="border border-black bg-white text-black px-5 py-3 text-sm font-['Space_Mono'] uppercase tracking-wide hover:bg-black hover:text-white"
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="border border-black bg-black text-white px-6 py-3 text-sm font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="border border-black bg-black text-white px-6 py-3 text-sm font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
            >
              {PITCH_ENTER_CTA}
            </button>
          )}
          {!isLast && (
            <button
              type="button"
              onClick={onComplete}
              className="text-xs font-['Space_Mono'] uppercase underline underline-offset-4 text-black/50 hover:text-black"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
