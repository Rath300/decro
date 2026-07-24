import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import bcrypt from 'bcryptjs'
import { authOptions, getAuthPool } from '@/lib/auth'
import { rateLimit, tooManyRequests } from '@/lib/rate-limit'

// The settings page previously called supabase.auth.updateUser, which could
// never work: these users live in the Better Auth "user"/"account" tables, not
// in Supabase Auth. Passwords are bcrypt hashes in account.password.

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Keyed by user, not IP: this is the endpoint that would let a hijacked
  // session guess the current password to take the account over permanently.
  const limit = rateLimit(`change-password:${session.user.id}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!limit.ok) {
    return tooManyRequests(limit, 'Too many attempts. Try again later.')
  }

  let body: { currentPassword?: unknown; newPassword?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword =
    typeof body.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current and new password are required' },
      { status: 400 }
    )
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters' },
      { status: 400 }
    )
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: 'New password must be different from the current one' },
      { status: 400 }
    )
  }

  const pool = getAuthPool()

  try {
    const { rows } = await pool.query(
      'SELECT id, password FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
      [session.user.id, 'credential']
    )

    const account = rows[0]
    if (!account?.password) {
      return NextResponse.json(
        { error: 'This account has no password set' },
        { status: 400 }
      )
    }

    const valid = await bcrypt.compare(currentPassword, account.password)
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await pool.query(
      'UPDATE "account" SET password = $1, "updatedAt" = now() WHERE id = $2',
      [hash, account.id]
    )

    // Invalidate any Better Auth sessions; the NextAuth JWT is stateless and
    // expires on its own maxAge.
    await pool.query('DELETE FROM "session" WHERE "userId" = $1', [
      session.user.id,
    ])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[change-password] failed:', error?.message)
    return NextResponse.json(
      { error: 'Could not change password' },
      { status: 500 }
    )
  }
}
