import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/signup',
  '/forgot-password',
  '/feed',
  '/spotlight',
  '/subgroup',
  '/feedback',
  '/post',
  '/search',
  '/algorithm',
]

// Known AI crawlers/bots to block
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
];

// Simple in-memory rate limiting (for production, use Redis/Upstash)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';

  // Block AI crawlers
  const isAIBot = AI_USER_AGENTS.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );

  if (isAIBot) {
    return new NextResponse('Forbidden - AI scraping not allowed', { 
      status: 403,
      headers: {
        'X-Robots-Tag': 'noai, noimageai, noindex, nofollow',
      }
    });
  }

  // Rate limit media/API endpoints
  if (pathname.startsWith('/api/images') || pathname.startsWith('/media')) {
    if (isRateLimited(ip)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  
  // allow next internals and api/static
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/assets')
  ) {
    return NextResponse.next()
  }

  // Check if path starts with any public path (allows /spotlight/[id], /subgroup/[slug], etc.)
  const isPublic = PUBLIC_PATHS.some(publicPath => pathname === publicPath || pathname.startsWith(publicPath + '/'))
  
  // NextAuth session cookies (production: __Secure-next-auth.session-token, dev: next-auth.session-token)
  const hasSession = Array.from(req.cookies.getAll()).some(c => 
    c.name.includes('next-auth.session-token') || c.name.includes('__Secure-next-auth.session-token')
  )

  // Only redirect to home if not public and no session
  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static).*)'],
}




