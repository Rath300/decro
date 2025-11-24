import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // Prioritize explicit site URL for production
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return 'http://localhost:3000'
}

export const client = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: { 
    credentials: 'include',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    }
  }
})