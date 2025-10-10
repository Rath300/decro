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
    const anyAuth: any = auth as any
    const sessionRes = await anyAuth.api.getSession({ headers: Object.fromEntries((req as any).headers) })
    const session = sessionRes?.data || sessionRes?.session || sessionRes
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

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
        creator_id: userId,
        subgroup_id: subgroupId || null,
      })
      .select('id')
      .single()

    if (error) throw error

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
    return NextResponse.json({ error: e?.message || 'Create failed' }, { status: 500 })
  }
}


