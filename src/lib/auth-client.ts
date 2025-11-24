import { createAuthClient } from "better-auth/react"

// Get base URL - always use decro.net in production
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // In browser, use current origin
    return window.location.origin
  }
  
  // On server during build/SSR
  if (process.env.NODE_ENV === 'production') {
    return 'https://decro.net'
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