import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Seeded floor; unique visitors tracked in site_visitors add on top. */
const USER_COUNT_BASE = 2256

const VISITOR_COOKIE = 'decro_vid'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400 // ~13 months
const COUNTS_TTL_MS = 60_000
const LAST_SEEN_MIN_MS = 24 * 60 * 60 * 1000

type CachedCounts = {
  posts: number
  subgroups: number
  visitors: number
  at: number
}

let countsCache: CachedCounts | null = null

function readVisitorId(request: Request): string | null {
  const raw = request.headers.get('cookie') || ''
  const match = raw.match(/(?:^|;\s*)decro_vid=([0-9a-f-]{36})/i)
  return match?.[1] ?? null
}

async function getCounts(admin: ReturnType<typeof getSupabaseAdmin>) {
  const now = Date.now()
  if (countsCache && now - countsCache.at < COUNTS_TTL_MS) {
    return countsCache
  }

  const [postsRes, subgroupsRes, visitorsRes] = await Promise.all([
    admin.from('posts').select('id', { count: 'exact', head: true }),
    admin.from('subgroups').select('id', { count: 'exact', head: true }),
    admin.from('site_visitors').select('id', { count: 'exact', head: true }),
  ])

  countsCache = {
    posts: postsRes.count ?? 0,
    subgroups: subgroupsRes.count ?? 0,
    visitors: visitorsRes.count ?? 0,
    at: now,
  }
  return countsCache
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

    const nowIso = new Date().toISOString()
    const { data: existing } = await admin
      .from('site_visitors')
      .select('id, last_seen_at')
      .eq('id', visitorId)
      .maybeSingle()

    let visitorIncrement = 0
    if (!existing) {
      await admin.from('site_visitors').insert({
        id: visitorId,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
      })
      visitorIncrement = 1
      // Invalidate so the new visitor is reflected soon
      countsCache = null
    } else {
      const last = existing.last_seen_at
        ? new Date(existing.last_seen_at).getTime()
        : 0
      if (Date.now() - last > LAST_SEEN_MIN_MS) {
        await admin
          .from('site_visitors')
          .update({ last_seen_at: nowIso })
          .eq('id', visitorId)
      }
    }

    const counts = await getCounts(admin)
    const visitors = counts.visitors + visitorIncrement
    const users = USER_COUNT_BASE + visitors

    const res = NextResponse.json({
      posts: counts.posts,
      subgroups: counts.subgroups,
      users,
      visitors,
    })

    res.headers.set(
      'Cache-Control',
      'private, max-age=30, stale-while-revalidate=60'
    )

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
      {
        error: 'Stats unavailable',
        posts: countsCache?.posts ?? 0,
        subgroups: countsCache?.subgroups ?? 0,
        users: USER_COUNT_BASE + (countsCache?.visitors ?? 0),
      },
      { status: 500 }
    )
  }
}
