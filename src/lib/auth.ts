import { betterAuth } from "better-auth"
import { Pool } from "pg"

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
  trustedOrigins: [
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

const handler = auth.handler
export { handler as GET, handler as POST }


