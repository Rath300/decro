import { betterAuth } from "better-auth"
import { Pool } from "pg"

function normalizeOrigin(url?: string) {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `https://${url}`
}

export const auth = betterAuth({
  database: new Pool({ 
    connectionString: process.env.DATABASE_URL 
  }),
  emailAndPassword: { 
    enabled: true, 
    requireEmailVerification: false 
  },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  trustedOrigins: Array.from(new Set([
    process.env.NODE_ENV === 'production' ? normalizeOrigin(process.env.VERCEL_URL) : 'http://localhost:3000',
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    'http://localhost:3000',
  ].filter(Boolean) as string[])),
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


