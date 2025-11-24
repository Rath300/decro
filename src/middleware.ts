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
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
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




