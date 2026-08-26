import type { Metadata } from 'next'
import Link from 'next/link'
import { UPDATES, type UpdateBulletKind } from '@/lib/updates'

export const metadata: Metadata = {
  title: 'Updates',
  description:
    "A running record of what's shipped on Decro, straight from our own commit history.",
}

const KIND_LABEL: Record<UpdateBulletKind, string> = {
  Added: 'Added',
  Fixed: 'Fixed',
  Changed: 'Changed',
  Improved: 'Improved',
  Removed: 'Removed',
}

export default function UpdatesPage() {
  const sorted = [...UPDATES].sort((a, b) => b.id - a.id)

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono']">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="mb-10 sm:mb-14">
          <Link
            href="/"
            className="text-[10px] uppercase tracking-wide underline underline-offset-4 text-black/50 hover:text-black"
          >
            ← Back to the web
          </Link>
          <h1 className="mt-4 text-2xl sm:text-3xl uppercase tracking-tight">
            Updates
          </h1>
          <p className="mt-3 text-sm text-black/60 max-w-lg">
            A running record of what&rsquo;s shipped, pulled straight from our
            own commit history. No marketing copy, just what changed and when.
          </p>
        </div>

        <ol className="space-y-10 sm:space-y-12">
          {sorted.map((entry) => (
            <li key={entry.id} className="border-t border-black pt-5">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h2 className="text-sm uppercase tracking-wide">
                  Update #{String(entry.id).padStart(2, '0')}
                </h2>
                <span className="text-[10px] uppercase tracking-wide text-black/40">
                  {entry.date}
                </span>
              </div>

              {entry.intro && (
                <p className="mt-3 text-sm text-black/70 leading-relaxed">
                  {entry.intro}
                </p>
              )}

              {entry.bullets.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {entry.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="text-sm text-black/80 leading-relaxed pl-0"
                    >
                      <span className="uppercase text-[10px] tracking-wide text-black/40 mr-2">
                        {KIND_LABEL[b.kind]}
                      </span>
                      {b.text}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-14 pt-6 border-t border-black text-[10px] uppercase tracking-wide text-black/40">
          That&rsquo;s every update so far.
        </div>
      </main>
    </div>
  )
}
