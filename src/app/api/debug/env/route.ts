import { NextResponse } from 'next/server'

/**
 * Diagnostic endpoint to check environment variables
 * Remove this file after debugging!
 */
export async function GET() {
  // Allow access - this endpoint doesn't expose sensitive data
  // We only show if variables are SET, not their actual values

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET ❌',
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    checks: {
      siteUrlHasProtocol: process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http'),
      siteUrlIsHttps: process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'),
      databaseConfigured: !!process.env.DATABASE_URL,
    },
    warnings: [] as string[],
  }

  // Add warnings
  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    diagnostics.warnings.push('NEXT_PUBLIC_SITE_URL is not set!')
  } else if (!process.env.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    diagnostics.warnings.push('NEXT_PUBLIC_SITE_URL must start with https://')
  }

  if (!process.env.DATABASE_URL) {
    diagnostics.warnings.push('DATABASE_URL is not set!')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    diagnostics.warnings.push('NEXT_PUBLIC_SUPABASE_URL is not set!')
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

