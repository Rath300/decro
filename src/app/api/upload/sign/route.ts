import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { randomUUID } from 'node:crypto'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

// Issues a short-lived signed upload URL for one file.
//
// Uploads used to go straight from the browser to Supabase Storage under an
// "Anon upload media" policy with WITH CHECK (bucket_id = 'media'), i.e. any
// anonymous caller could fill the bucket with arbitrary files of any type or
// size. Proxying the bytes through this route instead is not an option because
// videos are allowed up to 500MB, well past a serverless request body limit.
//
// A signed upload URL keeps the large transfer browser-to-storage while making
// the server the thing that decides whether the upload may happen at all.

export const dynamic = 'force-dynamic'

const BUCKET = 'media'

type UploadKind = 'image' | 'audio' | 'video' | 'avatar'

const RULES: Record<
  UploadKind,
  { prefix: string; maxBytes: number; mimeTypes: string[] }
> = {
  image: {
    prefix: 'images',
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
  },
  avatar: {
    prefix: 'avatars',
    maxBytes: 5 * 1024 * 1024,
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: {
    kind?: unknown
    fileName?: unknown
    contentType?: unknown
    size?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const kind = body.kind as UploadKind
  const rule = RULES[kind]
  if (!rule) {
    return NextResponse.json(
      { error: 'kind must be one of image, avatar, audio, video' },
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

  // Server-generated path: a client-supplied path could overwrite or escape.
  const extension = safeExtension(body.fileName, contentType.split('/')[1] || 'bin')
  const path = `${rule.prefix}/${Date.now()}-${randomUUID()}.${extension}`

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[upload/sign] admin client unavailable:', error?.message)
    return NextResponse.json(
      { error: 'Server is not configured for uploads' },
      { status: 500 }
    )
  }

  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data) {
    console.error('[upload/sign] failed:', error?.message)
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
