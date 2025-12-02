/**
 * Cron Job: Refresh Trending Posts
 * Should be called every 15-30 minutes
 */

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Call the refresh_trending_posts function
    const { data, error } = await supabase.rpc('refresh_trending_posts')

    if (error) {
      console.error('Failed to refresh trending posts:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('Trending posts refreshed successfully')
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Trending posts refreshed'
    })
  } catch (error: any) {
    console.error('Unexpected error refreshing trending:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

