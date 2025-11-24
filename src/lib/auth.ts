import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  database: new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }),
  emailAndPassword: { 
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: { 
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ].filter(Boolean) as string[],
})
