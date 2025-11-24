import { auth } from '@/lib/auth'
import { NextRequest } from 'next/server'

// Wrapper to properly convert Next.js Request to standard Web Request
async function handleRequest(request: NextRequest) {
  // Clone the request body if it exists
  let body: string | undefined
  try {
    const clonedRequest = request.clone()
    body = await clonedRequest.text()
  } catch {
    body = undefined
  }

  // Create a new standard Request with the same URL, method, headers, and body
  const standardRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: body && body.length > 0 ? body : undefined,
  })

  // Call BetterAuth handler with the standard Request
  return auth.handler(standardRequest)
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}