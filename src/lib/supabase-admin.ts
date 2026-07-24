import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client. Bypasses RLS, so it must never be imported into a client
// component — only from route handlers under src/app/api.
//
// The client is created lazily so that a missing key surfaces as a 500 on the
// routes that need it rather than crashing every page at import time.

let cached: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from the Supabase dashboard ' +
        '(Project Settings > API > service_role) into your environment. It must ' +
        'never be prefixed with NEXT_PUBLIC_.'
    )
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return cached
}
