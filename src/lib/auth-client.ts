import { createAuthClient } from "better-auth/react"

export const client = createAuthClient({
  baseURL: typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth`
    : "http://localhost:3000/api/auth",
}) 

