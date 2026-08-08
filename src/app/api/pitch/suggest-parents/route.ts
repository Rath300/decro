import { NextResponse } from 'next/server'
import { isPitchMode } from '@/lib/pitch-mode'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { suggestParents } from '@/lib/pitch-place'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Available whenever creating groups; not pitch-gated
  const limit = rateLimit(clientKey(request, 'suggest-parents'), {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) return tooManyRequests(limit, 'Slow down')

  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') || '').trim().slice(0, 80)
  const description = (searchParams.get('description') || '').trim().slice(0, 400)

  if (name.length < 2) {
    return NextResponse.json({
      suggestions: [],
      recommended: [],
      lowConfidence: true,
    })
  }

  const result = suggestParents(name, description)
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': isPitchMode()
        ? 'public, s-maxage=30, stale-while-revalidate=60'
        : 'private, max-age=10',
    },
  })
}
