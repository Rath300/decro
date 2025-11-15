import { betterAuth } from "better-auth"
import { Pool } from "pg"

const normalizeOrigin = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/*/, '')}`
  try {
    return new URL(withScheme).origin
  } catch {
    console.warn(`[better-auth] Ignoring invalid trusted origin: ${value}`)
    return undefined
  }
}

const vercelOrigin = normalizeOrigin(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
const siteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
const extraOrigins = (process.env.BETTER_AUTH_EXTRA_ORIGINS || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter((origin): origin is string => Boolean(origin))

const localOrigin = 'http://localhost:3000'

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.NODE_ENV === 'production' ? vercelOrigin : localOrigin,
      siteOrigin,
      localOrigin,
      ...extraOrigins,
    ].filter((origin): origin is string => Boolean(origin))
  )
)

export const auth = betterAuth({
  database: new Pool({ 
    connectionString: process.env.DATABASE_URL 
  }),
  emailAndPassword: { 
    enabled: true, 
    requireEmailVerification: false 
  },
  session: { 
    expiresIn: 60 * 60 * 24 * 7,
    // Ensure cookie is sent to all routes on the origin
    cookie: {
      name: 'better-auth.session',
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    } as any,
  },
  trustedOrigins,
  emailVerification: {
    sendVerificationEmail: async (data: any) => {
      console.log('Email verification sent to:', data.user.email)
    }
  },
  passwordReset: {
    sendPasswordResetEmail: async (data: any) => {
      console.log('Password reset email sent to:', data.user.email)
      return { success: true }
    }
  }
})

const handler = auth.handler
export { handler as GET, handler as POST }


