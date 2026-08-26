import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimit } from '@/lib/rate-limit'
import { isPitchMode, isPitchParkedPath } from '@/lib/pitch-mode'

// Paths that must be reachable without a session. Profile and tag pages are
// listed in sitemap.xml and are the site's public shopfront, but the previous
// prefix list omitted them, so every crawler and every link shared with a
// signed-out visitor bounced to the landing page.
const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/search',
  '/trending',
  '/algorithm',
  '/updates',
])

const PUBLIC_PREFIXES = [
  '/feed',
  '/spotlight',
  '/subgroup',
  '/feedback',
  '/post',
  '/tags',
  '/trending',
]

// These sit under an otherwise public prefix but are personal.
const PROTECTED_EXACT = new Set(['/profile', '/profile/edit'])

// Crawlers that harvest training data. Blocking by user agent is honour-system
// only, but it is the signal these bots claim to respect.
const AI_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'anthropic-ai',
  'Claude-Web',
  'ClaudeBot',
  'Google-Extended',
  'GoogleOther',
  'PerplexityBot',
  'Bytespider',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'FacebookBot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'OmgiliBot',
  'Timpibot',
]

function isPublic(pathname: string) {
  if (PROTECTED_EXACT.has(pathname)) return false

  if (PUBLIC_EXACT.has(pathname)) return true

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true
  }

  // /profile/<username> is a public page; /profile and /profile/edit are not.
  if (pathname.startsWith('/profile/')) return true

  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const userAgent = req.headers.get('user-agent') || ''

  const isAIBot = AI_USER_AGENTS.some((bot) =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  )

  if (isAIBot) {
    return new NextResponse('Forbidden - AI scraping not allowed', {
      status: 403,
      headers: { 'X-Robots-Tag': 'noai, noimageai, noindex, nofollow' },
    })
  }

  if (pathname.startsWith('/api/images') || pathname.startsWith('/media')) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const limit = rateLimit(`media:${ip}`, { limit: 100, windowMs: 60_000 })
    if (!limit.ok) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds) },
      })
    }
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/assets') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // 14-day pitch prototype: park the full product surface behind `/`.
  if (isPitchMode() && isPitchParkedPath(pathname)) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isPitchMode()) {
    return NextResponse.next()
  }

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // This used to accept any cookie whose name merely contained
  // "next-auth.session-token", so a forged cookie with arbitrary contents was
  // enough to load protected pages. getToken verifies the JWT signature.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET,
  })

  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static).*)'],
}
