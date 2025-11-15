import { createAuthClient } from "better-auth/react"

const normalizeOrigin = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/*/, '')}`
  try {
    return new URL(withScheme).origin
  } catch {
    console.warn(`[better-auth] Ignoring invalid base URL: ${value}`)
    return undefined
  }
}

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  const envOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  if (envOrigin) return envOrigin

  if (process.env.VERCEL_URL) {
    return normalizeOrigin(`https://${process.env.VERCEL_URL}`) ?? `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

export const client = createAuthClient({
  baseURL: getBaseURL(),
  fetchOptions: { credentials: 'include' }
})