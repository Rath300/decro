import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'
import { auth } from '@/lib/auth'
import { uploadImage, uploadAudio, uploadVideo } from '@/lib/upload'
import { headers as nextHeaders } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = String(form.get('title') || '')
    const description = String(form.get('description') || '')
    const contentType = String(form.get('contentType') || 'image')
    const isCurated = String(form.get('isCurated') || 'false') === 'true'
    const subgroupIdStr = String(form.get('subgroupId') || '')
    const subgroupId = subgroupIdStr ? subgroupIdStr : null
    const tagsJson = String(form.get('tags') || '[]')
    const tags: string[] = JSON.parse(tagsJson)
    const file = form.get('file') as File | null
    const audioFile = form.get('audioFile') as File | null
    const videoFile = form.get('videoFile') as File | null

    if (!title) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    // Auth (Better Auth - get session from request headers)
    let sessionRes: any
    try {
      const h = nextHeaders()
      const cookieHeader = h.get('cookie') || (req.headers as any).get?.('cookie') || ''
      sessionRes = await (auth as any).api.getSession({ headers: { cookie: cookieHeader } } as any)
    } catch {
      try {
        sessionRes = await auth.api.getSession(req.headers as any)
      } catch {
        sessionRes = await (auth as any).api.getSession({ headers: req.headers } as any)
      }
    }
    const session = sessionRes?.data || sessionRes?.session || sessionRes
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const externalId: string = session.user.id

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
      description_param: description,
      content_type_param: contentType,
      media_url_param: mediaUrl,
      audio_url_param: audioUrl,
      video_url_param: videoUrl,
      is_curated_param: isCurated,
      subgroup_id_param: subgroupId,
      tags_param: tags
    })

    if (rpcError) {
      console.error('create_post_ext failed:', rpcError)
      return NextResponse.json({ error: rpcError.message || 'Create failed' }, { status: 500 })
    }

    return NextResponse.json({ id: newId })
  } catch (e: any) {
    console.error('Create post failed:', e)
    return NextResponse.json({ error: e?.message || 'Create failed' }, { status: 500 })
  }
}


