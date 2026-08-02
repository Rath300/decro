import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { clientKey, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { isPitchMode } from '@/lib/pitch-mode'

export const dynamic = 'force-dynamic'

const BUCKET = 'media'

type UploadKind = 'image' | 'audio' | 'video'

const RULES: Record<
  UploadKind,
  { prefix: string; maxBytes: number; mimeTypes: string[] }
> = {
  image: {
    prefix: 'images',
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  },
  audio: {
    prefix: 'audio',
    maxBytes: 100 * 1024 * 1024,
    mimeTypes: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/webm',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
    ],
  },
  video: {
    prefix: 'videos',
    maxBytes: 500 * 1024 * 1024,
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  },
}

function safeExtension(name: unknown, fallback: string) {
  if (typeof name !== 'string') return fallback
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : fallback
}

export async function POST(request: Request) {
  if (!isPitchMode()) {
    return NextResponse.json({ error: 'Pitch mode is off' }, { status: 404 })
  }

  const limit = rateLimit(clientKey(request, 'pitch-sign'), {
    limit: 5,
    windowMs: 15 * 60_000,
  })
  if (!limit.ok) {
    return tooManyRequests(limit, 'Too many uploads. Try again later.')
  }

  let body: {
    kind?: unknown
    fileName?: unknown
    contentType?: unknown
    size?: unknown
    website?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Honeypot — bots fill hidden fields.
  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ error: 'Rejected' }, { status: 400 })
  }

  const kind = body.kind as UploadKind
  const rule = RULES[kind]
  if (!rule) {
    return NextResponse.json(
      { error: 'kind must be one of image, audio, video' },
      { status: 400 }
    )
  }

  const contentType =
    typeof body.contentType === 'string' ? body.contentType.split(';')[0].trim() : ''
  if (!rule.mimeTypes.includes(contentType)) {
    return NextResponse.json(
      { error: `${contentType || 'This file type'} is not allowed for ${kind} uploads` },
      { status: 415 }
    )
  }

  const size = typeof body.size === 'number' ? body.size : Number.NaN
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'A valid file size is required' }, { status: 400 })
  }
  if (size > rule.maxBytes) {
    const limitMb = Math.round(rule.maxBytes / (1024 * 1024))
    return NextResponse.json(
      { error: `${kind} uploads must be under ${limitMb}MB` },
      { status: 413 }
    )
  }

  const extension = safeExtension(body.fileName, contentType.split('/')[1] || 'bin')
  const path = `pitch/${rule.prefix}/${Date.now()}-${randomUUID()}.${extension}`

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[pitch/sign] admin unavailable:', error?.message)
    return NextResponse.json({ error: 'Server is not configured for uploads' }, { status: 500 })
  }

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[pitch/sign] failed:', error?.message)
    return NextResponse.json({ error: 'Could not start upload' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    bucket: BUCKET,
    path: data.path ?? path,
    token: data.token,
    publicUrl,
  })
}
