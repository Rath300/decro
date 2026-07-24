import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { rateLimit } from "./rate-limit"

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Supabase's pooler presents a certificate chain that Node's default trust
// store rejects ("self-signed certificate in certificate chain"). Encryption
// still happens; we just cannot pin the peer without their CA. Prefer
// DATABASE_CA_CERT when you have one. DATABASE_SSL_NO_VERIFY=true forces the
// same escape hatch for non-Supabase hosts.
function sslConfig() {
  if (process.env.NODE_ENV !== 'production') return false

  if (process.env.DATABASE_CA_CERT) {
    return { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true }
  }

  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL || '').hostname
    } catch {
      return ''
    }
  })()
  const isSupabase =
    host.endsWith('.supabase.com') || host.endsWith('.supabase.co')

  if (isSupabase || process.env.DATABASE_SSL_NO_VERIFY === 'true') {
    return { rejectUnauthorized: false }
  }

  return { rejectUnauthorized: true }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

/** Shared pool for route handlers that touch the Better Auth tables. */
export function getAuthPool() {
  return pool
}

// A missing secret makes NextAuth fall back to an unsafe default in some
// versions, so fail closed instead of starting up unauthenticated.
function authSecret() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 32'
    )
  }
  return secret
}

// bcrypt hash of a value no user can produce, used to equalise timing.
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        // The same field accepts either an email or a username. Resolving the
        // username here replaces the old /api/resolve-username endpoint, which
        // returned any user's email address to unauthenticated callers.
        const identifier = credentials.email.trim()

        // Throttle by account and by source address, so neither hammering one
        // account nor spraying many accounts from one host is free. bcrypt cost
        // 12 already makes each guess slow; this caps the attempt rate too.
        const forwarded = req?.headers?.['x-forwarded-for']
        const ip =
          (Array.isArray(forwarded) ? forwarded[0] : forwarded)
            ?.split(',')[0]
            ?.trim() || 'unknown'

        const perAccount = rateLimit(`login:id:${identifier.toLowerCase()}`, {
          limit: 10,
          windowMs: 15 * 60 * 1000,
        })
        const perIp = rateLimit(`login:ip:${ip}`, {
          limit: 30,
          windowMs: 15 * 60 * 1000,
        })

        if (!perAccount.ok || !perIp.ok) {
          throw new Error("Too many attempts. Try again in a few minutes.")
        }

        try {
          const result = await pool.query(
            'SELECT * FROM "user" WHERE lower(email) = lower($1) OR lower(name) = lower($1) LIMIT 1',
            [identifier]
          )

          const user = result.rows[0]

          const accountResult = user
            ? await pool.query(
                'SELECT * FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
                [user.id, 'credential']
              )
            : { rows: [] as any[] }

          const account = accountResult.rows[0]

          // Compare against a dummy hash when the user or account is missing so
          // that response time does not reveal whether an account exists.
          const hash = account?.password ?? DUMMY_HASH
          const isValid = await bcrypt.compare(credentials.password, hash)

          if (!user || !account?.password || !isValid) {
            throw new Error("Invalid email or password")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email?.split('@')[0] || 'user',
            image: user.image,
          }
        } catch (error: any) {
          // Never echo internal errors to the client.
          if (error?.message === "Invalid email or password") throw error
          console.error("Auth error:", error?.message)
          throw new Error("Authentication failed")
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  secret: authSecret(),
}
