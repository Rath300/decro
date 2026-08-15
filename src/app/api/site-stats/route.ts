import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Seeded floor; unique visitors tracked in site_visitors add on top. */
const USER_COUNT_BASE = 2256

const VISITOR_COOKIE = 'decro_vid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // ~13 months

function readVisitorId(request: Request): string | null {
  const raw = request.headers.get('cookie') || ''
  const match = raw.match(/(?:^|;\s*)decro_vid=([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, 'site-stats'), {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) return tooManyRequests(limit, 'Slow down')

  try {
    const admin = getSupabaseAdmin()

    let visitorId = readVisitorId(request)
    let setCookie = false
    if (!visitorId) {
      visitorId = randomUUID()
      setCookie = true
    }

    const now = new Date().toISOString()
    const { data: existing } = await admin
      .from('site_visitors')
      .select('id')
      .eq('id', visitorId)
      .maybeSingle()

    if (!existing) {
      await admin.from('site_visitors').insert({
        id: visitorId,
        first_seen_at: now,
        last_seen_at: now,
      })
    } else {
      await admin
        .from('site_visitors')
        .update({ last_seen_at: now })
        .eq('id', visitorId)
    }

    const [postsRes, subgroupsRes, visitorsRes] = await Promise.all([
      admin.from('posts').select('id', { count: 'exact', head: true }),
      admin.from('subgroups').select('id', { count: 'exact', head: true }),
      admin.from('site_visitors').select('id', { count: 'exact', head: true }),
    ])

    const posts = postsRes.count ?? 0
    const subgroups = subgroupsRes.count ?? 0
    const visitors = visitorsRes.count ?? 0
    const users = USER_COUNT_BASE + visitors

    const res = NextResponse.json({
      posts,
      subgroups,
      users,
      visitors,
    })

    if (setCookie) {
      res.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      })
    }

    return res
  } catch (e: any) {
    console.error('[site-stats]', e?.message || e)
    return NextResponse.json(
      { error: 'Stats unavailable', posts: 0, subgroups: 0, users: USER_COUNT_BASE },
      { status: 500 }
    )
  }
}
