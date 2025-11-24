import { betterAuth } from "better-auth"
import { Pool } from "pg"

// Get base URL - always use decro.net in production
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://decro.net'
  }
  return 'http://localhost:3000'
}

export const auth = betterAuth({
  baseURL: getBaseURL(),
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
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    'https://decro.net',
    'https://www.decro.net',
  ],
})
