import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'
import {
  attachPitchGuestCookie,
  createPitchGuestId,
  pitchExternalId,
  readPitchGuestId,
  sanitizePitchUsername,
} from '@/lib/pitch-guest'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const subgroupId = searchParams.get('subgroupId') || ''
  if (!/^[0-9a-f-]{36}$/i.test(subgroupId)) {
    return NextResponse.json({ error: 'Invalid subgroup' }, { status: 400 })
  }

  const limit = rateLimit(clientKey(request, 'sg-chat-get'), {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limit.ok) return tooManyRequests(limit, 'Slow down')

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('subgroup_chat_messages')
      .select('id,username,content,created_at,author_external_id')
      .eq('subgroup_id', subgroupId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) throw error
    return NextResponse.json({ messages: data || [] })
  } catch (e: any) {
    console.error('[subgroup-chat] GET failed:', e?.message)
    return NextResponse.json({ error: 'Could not load chat' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, 'sg-chat-post'), {
    limit: 30,
    windowMs: 60_000,
  })
  if (!limit.ok) return tooManyRequests(limit, 'Slow down')

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subgroupId =
    typeof body.subgroupId === 'string' ? body.subgroupId : ''
  const content =
    typeof body.content === 'string' ? body.content.trim().slice(0, 1000) : ''

  if (!/^[0-9a-f-]{36}$/i.test(subgroupId)) {
    return NextResponse.json({ error: 'Invalid subgroup' }, { status: 400 })
  }
  if (content.length < 1) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  let externalId = session?.user?.id || ''
  let username =
    (session?.user as any)?.username ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    'member'

  let newGuestId: string | null = null

  if (!externalId) {
    if (!isPitchMode()) {
      return NextResponse.json({ error: 'Sign in to chat' }, { status: 401 })
    }
    const existing = readPitchGuestId()
    const guestId = existing || createPitchGuestId()
    if (!existing) newGuestId = guestId
    externalId = pitchExternalId(guestId)
    username = sanitizePitchUsername(body.username, guestId)
    try {
      const admin = getSupabaseAdmin()
      await admin.rpc('upsert_profile_from_external', {
        external_id_param: externalId,
        username_param: username,
        full_name_param: username,
      })
    } catch {
      /* non-fatal */
    }
  }

  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('subgroup_chat_messages')
      .insert({
        subgroup_id: subgroupId,
        author_external_id: externalId,
        username: String(username).slice(0, 40),
        content,
      })
      .select('id,username,content,created_at,author_external_id')
      .single()

    if (error) throw error

    const out = NextResponse.json({ message: data })
    if (newGuestId) attachPitchGuestCookie(out, newGuestId)
    return out
  } catch (e: any) {
    console.error('[subgroup-chat] POST failed:', e?.message)
    return NextResponse.json({ error: 'Could not send message' }, { status: 500 })
  }
}
