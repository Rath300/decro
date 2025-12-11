import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'
import { authOptions } from '@/lib/auth'
import { uploadImage, uploadAudio, uploadVideo } from '@/lib/upload'
import { getServerSession } from 'next-auth/next'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = String(form.get('title') || '').trim()
    const description = String(form.get('description') || '').trim()
    const contentType = String(form.get('contentType') || 'image')
    const isCurated = String(form.get('isCurated') || 'false') === 'true'
    const subgroupIdStr = String(form.get('subgroupId') || '')
    const subgroupId = subgroupIdStr ? subgroupIdStr : null
    const tagsJson = String(form.get('tags') || '[]')
    let tags: string[] = []
    
    try {
      tags = JSON.parse(tagsJson)
      if (!Array.isArray(tags)) {
        tags = []
      }
    } catch (parseError) {
      console.warn('Failed to parse tags:', parseError)
      tags = []
    }
    
    const file = form.get('file') as File | null
    const audioFile = form.get('audioFile') as File | null
    const videoFile = form.get('videoFile') as File | null

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Auth - NextAuth session
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('Unauthorized post creation attempt')
      return NextResponse.json({ error: 'You must be signed in to create posts' }, { status: 401 })
    }
    const externalId: string = session.user.id
    
    console.log('Creating post:', { title, contentType, externalId })

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

    // Create post via SECURITY DEFINER RPC that maps external ID and handles tags
    const { data: newId, error: rpcError } = await supabase.rpc('create_post_ext', {
      external_id_param: externalId,
      title_param: title,
      description_param: description || null,
      content_type_param: contentType,
      media_url_param: mediaUrl,
      audio_url_param: audioUrl,
      video_url_param: videoUrl,
      is_curated_param: isCurated,
      subgroup_id_param: subgroupId,
      tags_param: tags
    })

    if (rpcError) {
      console.error('create_post_ext RPC failed:', rpcError)
      return NextResponse.json({ error: rpcError.message || 'Failed to create post' }, { status: 500 })
    }

    if (!newId) {
      console.error('No post ID returned from create_post_ext')
      return NextResponse.json({ error: 'Failed to create post - no ID returned' }, { status: 500 })
    }

    console.log('Post created successfully:', newId)
    return NextResponse.json({ id: newId, success: true })
  } catch (e: any) {
    console.error('Create post failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create post. Please try again.' }, { status: 500 })
  }
}


