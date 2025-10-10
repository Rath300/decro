import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
}

export const client = createAuthClient({
  baseURL: getBaseURL()
})