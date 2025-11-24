import { createAuthClient } from "better-auth/react"

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Prioritize explicit site URL for production
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const url = process.env.NEXT_PUBLIC_SITE_URL
    // Ensure URL has protocol
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    // Add https:// if missing (production default)
    return `https://${url}`
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