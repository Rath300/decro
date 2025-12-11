import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection can't be established
})

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials')
          throw new Error("Email and password required")
        }

        try {
          // Find user by email
          const result = await pool.query(
            'SELECT * FROM "user" WHERE email = $1',
            [credentials.email.toLowerCase().trim()]
          )

          const user = result.rows[0]

          if (!user) {
            console.error('User not found:', credentials.email)
            throw new Error("Invalid email or password")
          }

          // Get account with password
          const accountResult = await pool.query(
            'SELECT * FROM "account" WHERE "userId" = $1 AND "providerId" = $2',
            [user.id, 'credential']
          )

          const account = accountResult.rows[0]

          if (!account || !account.password) {
            console.error('Account not found or missing password')
            throw new Error("Invalid email or password")
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, account.password)

          if (!isValid) {
            console.error('Invalid password')
            throw new Error("Invalid email or password")
          }

          console.log('Authentication successful for user:', user.id)

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name || user.email.split('@')[0],
            image: user.image,
          }
        } catch (error: any) {
          console.error("Auth error:", error.message)
          throw new Error(error.message || "Authentication failed")
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
  secret: process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET,
}
