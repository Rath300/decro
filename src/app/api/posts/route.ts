import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'
import { auth } from '@/lib/auth'
import { uploadImage, uploadAudio, uploadVideo } from '@/lib/upload'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = String(form.get('title') || '')
    const description = String(form.get('description') || '')
    const contentType = String(form.get('contentType') || 'image')
    const isCurated = String(form.get('isCurated') || 'false') === 'true'
    const subgroupId = String(form.get('subgroupId') || '')
    const tagsJson = String(form.get('tags') || '[]')
    const tags: string[] = JSON.parse(tagsJson)
    const file = form.get('file') as File | null
    const audioFile = form.get('audioFile') as File | null
    const videoFile = form.get('videoFile') as File | null

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    // Auth (Better Auth - get session from request headers)
    const sessionRes = await auth.api.getSession(req.headers as any)
    const session = (sessionRes as any)?.data || (sessionRes as any)?.session || sessionRes
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const externalId: string = session.user.id

    // Map external auth id -> profiles.id (uuid)
    const desiredUsername = session.user.name || session.user.email?.split('@')[0] || null
    const { data: profileId, error: ensureErr } = await supabase.rpc('ensure_profile', {
      external_id_param: externalId,
      username_param: desiredUsername,
    })
    if (ensureErr) {
      console.error('ensure_profile failed:', ensureErr)
      return NextResponse.json({ error: 'Profile mapping failed' }, { status: 500 })
    }

    // Upload files using optimized upload utilities
    let mediaUrl: string | null = null
    let audioUrl: string | null = null
    let videoUrl: string | null = null

    try {
      if (file) {
        const result = await uploadImage(file)
        mediaUrl = result.url
      }
      if (audioFile) {
        const result = await uploadAudio(audioFile)
        audioUrl = result.url
      }
      if (videoFile) {
        const result = await uploadVideo(videoFile)
        videoUrl = result.url
      }
    } catch (uploadError: any) {
      console.error('Upload failed:', uploadError)
      return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 })
    }

    // Insert post using profiles.id (uuid) as creator_id
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        description,
        content_type: contentType,
        media_url: mediaUrl,
        audio_url: audioUrl,
        video_url: videoUrl,
        is_curated: isCurated,
        creator_id: profileId,
        subgroup_id: subgroupId || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Insert post failed:', error)
      return NextResponse.json({ error: error.message || 'Insert failed' }, { status: 500 })
    }

    // Add tags if provided
    if (tags && tags.length > 0 && data?.id) {
      for (const tagName of tags) {
        try {
          // Get or create tag
          const { data: tagId, error: tagError } = await supabase.rpc('get_or_create_tag', {
            tag_name: tagName
          })

          if (!tagError && tagId) {
            // Link tag to post
            await supabase
              .from('post_tags')
              .insert({ post_id: data.id, tag_id: tagId })
          }
        } catch (tagErr) {
          console.warn('Failed to add tag:', tagName, tagErr)
          // Don't fail the whole request if tags fail
        }
      }
    }

    return NextResponse.json({ id: data?.id })
  } catch (e: any) {
    console.error('Create post failed:', e)
    return NextResponse.json({ error: e?.message || 'Create failed' }, { status: 500 })
  }
}


