import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'
import type { NextResponse } from 'next/server'

export const PITCH_GUEST_COOKIE = 'pitch_guest_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export function pitchExternalId(guestId: string) {
  return `pitch:${guestId}`
}

export function readPitchGuestId(): string | null {
  const existing = cookies().get(PITCH_GUEST_COOKIE)?.value
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing
  return null
}

export function createPitchGuestId(): string {
  return randomUUID()
}

export function attachPitchGuestCookie(res: NextResponse, guestId: string) {
  res.cookies.set(PITCH_GUEST_COOKIE, guestId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export function sanitizePitchUsername(raw: unknown, guestId: string): string {
  const short = guestId.replace(/-/g, '').slice(0, 8)
  if (typeof raw !== 'string' || !raw.trim()) {
    return `anonymous_${short}`
  }
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)

  if (cleaned.length < 2) return `anonymous_${short}`
  if (cleaned === 'anonymous') return `anonymous_${short}`
  return cleaned
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
