import { createAuthClient } from 'better-auth/client'

function normalizeBase(url?: string) {
  if (!url) return undefined
  if (url.startsWith('http')) return url
  return `https://${url}`
}

export const client = createAuthClient({
  baseURL: normalizeBase(
    process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://your-domain.vercel.app'
      : 'http://localhost:3000'
  )
})