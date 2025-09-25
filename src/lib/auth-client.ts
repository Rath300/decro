import { createAuthClient } from "better-auth/react"

export const client = createAuthClient({
  baseURL: process.env.NODE_ENV === 'production'
    ? 'https://your-domain.vercel.app'
    : 'http://localhost:3000'
})