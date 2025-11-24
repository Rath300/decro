import { betterAuth } from "better-auth"
import { Pool } from "pg"

// Get base URL for BetterAuth
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_SITE_URL 
      : `https://${process.env.NEXT_PUBLIC_SITE_URL || 'decro.net'}`
  }
  return 'http://localhost:3000'
}

export const auth = betterAuth({
  baseURL: getBaseURL(), // CRITICAL: Required for Next.js App Router
  database: new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
  emailAndPassword: { 
    enabled: true, 
    requireEmailVerification: false 
  },
  session: { 
    expiresIn: 60 * 60 * 24 * 7,
    cookie: {
      name: 'better-auth.session',
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      domain: process.env.NODE_ENV === 'production' ? 'decro.net' : undefined,
    } as any,
  },
  trustedOrigins: [
    'https://decro.net',
    'https://www.decro.net',
    process.env.NODE_ENV === 'production' && process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
    process.env.NEXT_PUBLIC_SITE_URL || '',
    'http://localhost:3000',
  ].filter(Boolean) as string[],
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