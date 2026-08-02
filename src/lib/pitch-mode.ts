/**
 * Pitch mode parks the full Decro product behind a 14-day no-login prototype.
 * Content still writes into the same Supabase tables, so flipping the flag off
 * restores the full app with seeded posts/groups intact.
 */
export function isPitchMode(): boolean {
  return process.env.NEXT_PUBLIC_PITCH_MODE === 'true'
}

export const PITCH_PARKED_PREFIXES = [
  '/feed',
  '/spotlight',
  '/trending',
  '/profile',
  '/messages',
  '/settings',
  '/signup',
  '/forgot-password',
  '/search',
  '/algorithm',
  '/tags',
  '/post',
  '/subgroup',
  '/feedback',
] as const

export function isPitchParkedPath(pathname: string): boolean {
  if (pathname === '/') return false
  return PITCH_PARKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}
