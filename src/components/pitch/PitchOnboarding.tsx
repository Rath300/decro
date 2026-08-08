'use client'

import Image from 'next/image'
import {
  PITCH_DISCORD_HANDLES,
  PITCH_EMAIL,
  PITCH_TOUR_COPY,
  PITCH_TOUR_TOTAL,
  type PitchTourStage,
} from '@/lib/pitch-copy'
import PitchTourSpotlight from '@/components/pitch/PitchTourSpotlight'

type Props = {
  stage: PitchTourStage
  onNext: () => void
  onSkip: () => void
}

function stepOf(stage: PitchTourStage): number {
  const order: PitchTourStage[] = [
    'welcome',
    'click-main',
    'click-niche',
    'upload',
    'search',
    'create',
    'guest',
  ]
  const i = order.indexOf(stage)
  return i >= 0 ? i + 1 : 1
}

export default function PitchOnboarding({ stage, onNext, onSkip }: Props) {
  if (stage === 'done') return null

  const copy = PITCH_TOUR_COPY[stage]
  const isWelcome = stage === 'welcome'
  const isGuest = stage === 'guest'
  const stepNum = stepOf(stage)
  const target = copy.target

  if (isWelcome) {
    return (
      <div className="fixed inset-0 z-[70] bg-white/95 flex items-center justify-center px-5 sm:px-8 py-20">
        <div className="max-w-md w-full border border-black bg-white p-6 sm:p-8">
          <Image
            src="/decky.png"
            alt="Decro"
            width={72}
            height={72}
            className="w-16 h-16 sm:w-[72px] sm:h-[72px]"
            priority
          />
          <p className="mt-5 text-[10px] font-['Space_Mono'] uppercase tracking-wide text-black/45">
            Tutorial · {stepNum} / {PITCH_TOUR_TOTAL}
          </p>
          <h1 className="mt-2 text-xl sm:text-2xl font-['Space_Mono'] font-normal">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm font-['Space_Mono'] leading-relaxed text-black/80">
            {copy.body}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNext}
              className="border border-black bg-black text-white px-5 py-2.5 text-sm font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
            >
              {copy.cta || 'Next'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-['Space_Mono'] uppercase underline underline-offset-4 text-black/45 hover:text-black"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  const cardBottom =
    target === 'upload' || target === 'search' || target === 'new-group' || target === 'duck'

  return (
    <>
      <PitchTourSpotlight target={target && target !== 'graph' ? target : null} />
      <div
        className={`pointer-events-none fixed inset-x-0 z-[69] flex justify-center px-3 ${
          cardBottom
            ? 'top-16 sm:top-20'
            : 'top-16 sm:top-auto sm:bottom-0 sm:pb-6'
        }`}
      >
        <div className="pointer-events-auto max-w-md w-full border border-black bg-white p-4 sm:p-5 mr-0 sm:mr-0">
          <p className="text-[10px] font-['Space_Mono'] uppercase tracking-wide text-black/45">
            Tutorial · {stepNum} / {PITCH_TOUR_TOTAL}
          </p>
          <h2 className="mt-1 text-base sm:text-lg font-['Space_Mono'] font-normal">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm font-['Space_Mono'] leading-relaxed text-black/75">
            {copy.body}
          </p>
          {target && target !== 'graph' && (
            <p className="mt-2 text-[10px] font-['Space_Mono'] uppercase tracking-wide text-black/40">
              Look for the highlighted control ↑
            </p>
          )}
          {isGuest && (
            <p className="mt-2 text-xs font-['Space_Mono'] text-black/50">
              Feedback: {PITCH_EMAIL} · Discord {PITCH_DISCORD_HANDLES[0]} /{' '}
              {PITCH_DISCORD_HANDLES[1]}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNext}
              className="border border-black bg-black text-white px-4 py-2 text-xs font-['Space_Mono'] uppercase tracking-wide hover:bg-white hover:text-black"
            >
              {copy.cta || 'Next'}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-[10px] font-['Space_Mono'] uppercase underline underline-offset-4 text-black/40 hover:text-black"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
