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
  slugifyName,
} from '@/lib/pitch-guest'
import { normalizeChosenParents, placeSubgroupOnWeb } from '@/lib/pitch-place'

export const dynamic = 'force-dynamic'

const MAX_BODY_CHARS = 8_000
const ALLOWED_TYPES = new Set([
  'image',
  'music',
  'video',
  'text',
  'film',
  'physical_art',
  'edits',
  'graphic_design',
])

export async function POST(request: Request) {
  if (!isPitchMode()) {
    return NextResponse.json({ error: 'Pitch mode is off' }, { status: 404 })
  }

  const limit = rateLimit(clientKey(request, 'pitch-post'), {
    limit: 10,
    windowMs: 60 * 60_000,
  })
  if (!limit.ok) {
    return tooManyRequests(limit, 'Too many posts. Try again in an hour.')
  }

  let body: Record<string, unknown>
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 })
    }
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ error: 'Rejected' }, { status: 400 })
  }

  const title =
    typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
  const description =
    typeof body.description === 'string'
      ? body.description.trim().slice(0, 2000)
      : ''
  const contentTypeRaw =
    typeof body.contentType === 'string' ? body.contentType : 'image'
  const contentType = ALLOWED_TYPES.has(contentTypeRaw) ? contentTypeRaw : 'image'

  const mediaUrl =
    typeof body.mediaUrl === 'string' && body.mediaUrl.startsWith('http')
      ? body.mediaUrl.slice(0, 2000)
      : null
  const audioUrl =
    typeof body.audioUrl === 'string' && body.audioUrl.startsWith('http')
      ? body.audioUrl.slice(0, 2000)
      : null
  const videoUrl =
    typeof body.videoUrl === 'string' && body.videoUrl.startsWith('http')
      ? body.videoUrl.slice(0, 2000)
      : null

  if (contentType === 'text') {
    if (!title && !description) {
      return NextResponse.json({ error: 'Text posts need a title or body' }, { status: 400 })
    }
  } else if (contentType === 'music') {
    if (!audioUrl) {
      return NextResponse.json({ error: 'Music posts need an audio file' }, { status: 400 })
    }
  } else if (contentType === 'video' || contentType === 'film') {
    if (!videoUrl) {
      return NextResponse.json({ error: 'Video posts need a video file' }, { status: 400 })
    }
  } else if (!mediaUrl) {
    return NextResponse.json({ error: 'An image is required' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  let externalId = session?.user?.id || ''
  let username =
    (session?.user as { username?: string } | undefined)?.username ||
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    ''
  let newGuestId: string | null = null

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (error: any) {
    console.error('[pitch/post] admin unavailable:', error?.message)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (externalId) {
    // Signed-in: ensure profile exists and prefer DB username
    const { data: ensuredId, error: ensureErr } = await admin.rpc(
      'ensure_profile',
      { external_id_param: externalId }
    )
    if (ensureErr) {
      console.error('[pitch/post] ensure_profile failed:', ensureErr.message)
      return NextResponse.json({ error: 'Could not load profile' }, { status: 500 })
    }
    if (ensuredId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('username')
        .eq('id', ensuredId)
        .maybeSingle()
      if (profile?.username) username = profile.username
    }
    if (!username) username = 'member'
  } else {
    const existingGuest = readPitchGuestId()
    const guestId = existingGuest || createPitchGuestId()
    if (!existingGuest) newGuestId = guestId
    externalId = pitchExternalId(guestId)
    username = sanitizePitchUsername(body.username, guestId)

    const { error: profileError } = await admin.rpc(
      'upsert_profile_from_external',
      {
        external_id_param: externalId,
        username_param: username,
        full_name_param: username,
      }
    )
    if (profileError) {
      console.error('[pitch/post] profile upsert failed:', profileError.message)
      return NextResponse.json(
        { error: 'Could not create guest profile' },
        { status: 500 }
      )
    }
  }

  let subgroupId: string | null =
    typeof body.subgroupId === 'string' &&
    /^[0-9a-f-]{36}$/i.test(body.subgroupId)
      ? body.subgroupId
      : null

  const newGroupName =
    typeof body.newGroupName === 'string' ? body.newGroupName.trim().slice(0, 60) : ''
  const chosenParents = normalizeChosenParents(body.parentHubIds)

  if (!subgroupId && newGroupName.length >= 3) {
    if (!chosenParents) {
      return NextResponse.json(
        { error: 'Pick 1–2 parent groups for the new group' },
        { status: 400 }
      )
    }
    const slug = slugifyName(newGroupName)
    if (slug.length < 3) {
      return NextResponse.json({ error: 'Group name is invalid' }, { status: 400 })
    }
    const { data: created, error: createErr } = await admin.rpc('create_subgroup_ext', {
      external_id_param: externalId,
      name_param: newGroupName,
      slug_param: slug,
      description_param: 'Created during pitch mode',
      cover_image_url_param: null,
    })
    if (createErr) {
      console.error('[pitch/post] create subgroup failed:', createErr.message)
      return NextResponse.json({ error: 'Could not create group' }, { status: 500 })
    }
    const result = created as {
      success?: boolean
      error?: string
      id?: string
      slug?: string
    }
    if (!result?.success || !result.id) {
      return NextResponse.json(
        { error: result?.error || 'Could not create group' },
        { status: 400 }
      )
    }
    subgroupId = result.id
    try {
      await placeSubgroupOnWeb(admin, {
        id: result.id,
        name: newGroupName,
        description: 'Created during pitch mode',
        slug: result.slug || slug,
        parentHubIds: chosenParents,
      })
    } catch (placeErr: any) {
      console.error('[pitch/post] web placement failed:', placeErr?.message)
    }
  }

  if (!subgroupId) {
    return NextResponse.json(
      { error: 'Pick a group or create a new one' },
      { status: 400 }
    )
  }

  const { data: postId, error: postError } = await admin.rpc('create_post_ext', {
    external_id_param: externalId,
    title_param: title || 'Untitled',
    description_param: description || null,
    content_type_param: contentType,
    media_url_param: mediaUrl,
    audio_url_param: audioUrl,
    video_url_param: videoUrl,
    is_curated_param: false,
    subgroup_id_param: subgroupId,
    tags_param: null,
  })

  if (postError || !postId) {
    console.error('[pitch/post] create post failed:', postError?.message)
    return NextResponse.json({ error: 'Could not create post' }, { status: 500 })
  }

  const res = NextResponse.json({
    id: postId,
    subgroupId,
    username,
  })
  if (newGuestId) {
    attachPitchGuestCookie(res, newGuestId)
  }
  return res
}
