/**
 * Pitch mode parks the full Decro product behind a 14-day no-login prototype.
 * Content still writes into the same Supabase tables, so flipping the flag off
 * restores the full app with seeded posts/groups intact.
 */
export function isPitchMode(): boolean {
  return process.env.NEXT_PUBLIC_PITCH_MODE === 'true'
}

// Park the full product surface. /subgroup and /post stay open so genre hubs
// and work detail remain reachable from the community-first web.
// Login/signup stay open — optional identity; guests can still use the product.
export const PITCH_PARKED_PREFIXES = [
  '/feed',
  '/spotlight',
  '/trending',
  // /profile stays open so logged-in users can manage their page
  '/messages',
  '/settings',
  '/search',
  '/algorithm',
  '/tags',
  '/feedback',
] as const

export function isPitchParkedPath(pathname: string): boolean {
  if (pathname === '/') return false
  return PITCH_PARKED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
}
