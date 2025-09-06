import { betterAuth } from "better-auth"
import { Pool } from "pg"

// Lazy create handler to avoid DB connection at module load
export function getAuthHandler() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set. Auth routes will not work until it's configured.")
  }
  const auth = betterAuth({
    // Only create a Pool if we actually have a DB URL; avoids hanging at startup
    database: databaseUrl ? new Pool({ connectionString: databaseUrl }) : undefined,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
    },
    trustedOrigins: [
      process.env.NODE_ENV === "production"
        ? "https://your-domain.vercel.app"
        : "http://localhost:3000",
    ],
    emailVerification: {
      sendVerificationEmail: async (data: any) => {
        console.log('Email verification sent to:', data.user.email)
      },
    },
    passwordReset: {
      sendPasswordResetEmail: async (data: any) => {
        console.log('Password reset email sent to:', data.user.email)
        return { success: true }
      },
    },
  })
  return auth.handler
}
 


