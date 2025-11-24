import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Properly wrap BetterAuth handler for Next.js App Router
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const response = await auth.handler(new Request(url.toString(), {
      method: 'GET',
      headers: request.headers,
    }))
    return response
  } catch (error) {
    console.error('Auth GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const body = await request.text() // Get raw body text
    
    const response = await auth.handler(new Request(url.toString(), {
      method: 'POST',
      headers: request.headers,
      body: body || undefined, // Only pass body if it exists
    }))
    return response
  } catch (error) {
    console.error('Auth POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}