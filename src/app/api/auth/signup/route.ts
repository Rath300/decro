import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"
import { getAuthPool } from "@/lib/auth"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

// Uses the shared pool from lib/auth rather than opening a second one that
// disabled TLS certificate verification.

export const dynamic = 'force-dynamic'

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'signup'), {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.ok) {
    return tooManyRequests(limit, 'Too many signup attempts. Try again later.')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  // The signup form sends the username in `name`.
  const username = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  if (!password || !username) {
    return NextResponse.json(
      { error: "Password and username are required" },
      { status: 400 }
    )
  }

  if (email && !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
  }

  // Was 6 here but 8 on the settings page; both are 8 now.
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 }
    )
  }

  if (password.length > 200) {
    return NextResponse.json({ error: "Password is too long" }, { status: 400 })
  }

  if (!USERNAME_PATTERN.test(username)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, underscores, and hyphens" },
      { status: 400 }
    )
  }

  if (username.length < 3 || username.length > 20) {
    return NextResponse.json(
      { error: "Username must be between 3 and 20 characters" },
      { status: 400 }
    )
  }

  const pool = getAuthPool()

  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    const userId = nanoid()
    const emailValue = email || null

    // The old code checked availability with a SELECT and then inserted, which
    // two concurrent signups could both pass. The unique indexes added in
    // migration 039 are now the authority; a violation is reported as a taken
    // name rather than a 500.
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        'INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, now(), now())',
        [userId, emailValue, username, false]
      )

      await client.query(
        'INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, now(), now())',
        [nanoid(), userId, 'credential', userId, hashedPassword]
      )

      await client.query('COMMIT')
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: { id: userId, email: emailValue, name: username },
      },
      { status: 201 }
    )
  } catch (error: any) {
    // 23505 is unique_violation.
    if (error?.code === '23505') {
      const takenField = String(error.constraint || '').includes('email')
        ? 'Email already in use'
        : 'Username already taken'
      return NextResponse.json({ error: takenField }, { status: 409 })
    }

    console.error("Signup error:", error?.message)
    return NextResponse.json(
      { error: "Failed to create user. Please try again." },
      { status: 500 }
    )
  }
}
