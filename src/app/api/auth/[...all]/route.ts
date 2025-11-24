import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// Wrapper to handle Next.js App Router specific request handling
async function handleAuth(request: NextRequest) {
  try {
    // Convert NextRequest to standard Request
    const url = new URL(request.url)
    
    // Read body if it exists
    let body: string | undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text()
      } catch {
        body = undefined
      }
    }
    
    // Create a standard Web Request
    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
      body: body && body.length > 0 ? body : undefined,
    })
    
    // Call BetterAuth handler with standard Request
    return await auth.handler(webRequest)
  } catch (error: any) {
    console.error('[Auth Handler Error]:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Authentication error', message: error.message },
      { status: 500 }
    )
  }
}

export const GET = handleAuth
export const POST = handleAuth
