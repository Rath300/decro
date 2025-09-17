import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/',
  '/signup',
  '/forgot-password',
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

  const isPublic = PUBLIC_PATHS.includes(pathname)
  // Better Auth session cookies typically contain "better-auth.session"
  const hasSession = Array.from(req.cookies.getAll()).some(c => c.name.includes('better-auth.session'))

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




