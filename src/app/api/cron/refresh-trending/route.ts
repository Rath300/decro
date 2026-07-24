/**
 * Cron Job: Refresh Trending Posts
 * Intended to run every 15-30 minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function isAuthorised(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  // The previous check was `if (cronSecret && ...)`, so an unset CRON_SECRET
  // left the endpoint open to anyone. Fail closed instead.
  if (!cronSecret) return false

  const authHeader = request.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const received = Buffer.from(authHeader)

  if (expected.length !== received.length) return false
  return timingSafeEqual(expected, received)
}

export async function GET(request: NextRequest) {
  if (!isAuthorised(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // refresh_trending_posts is service_role only (migration 037).
    const { data, error } = await getSupabaseAdmin().rpc('refresh_trending_posts')

    if (error) {
      console.error('Failed to refresh trending posts:', error.message)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: data,
    })
  } catch (error: any) {
    console.error('Unexpected error refreshing trending:', error?.message)
    return NextResponse.json(
      { success: false, error: 'Refresh failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
