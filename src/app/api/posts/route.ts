import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const title = String(form.get('title') || '')
    const description = String(form.get('description') || '')
    const contentType = String(form.get('contentType') || 'image')
    const isCurated = String(form.get('isCurated') || 'false') === 'true'
    const subgroupId = String(form.get('subgroupId') || '')
    const file = form.get('file') as File | null
    const audioFile = form.get('audioFile') as File | null
    const videoFile = form.get('videoFile') as File | null

    if (!title || !subgroupId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Auth
    const ctx = await auth.$context
    const session = await ctx.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Upload helpers
    const upload = async (path: string, f: File) => {
      const arrayBuf = await f.arrayBuffer()
      const { error } = await supabase.storage.from('media').upload(path, arrayBuf, {
        contentType: f.type,
        upsert: true,
      })
      if (error) throw error
      const { data: pub } = supabase.storage.from('media').getPublicUrl(path)
      return pub.publicUrl
    }

    const ts = Date.now()
    let mediaUrl: string | null = null
    let audioUrl: string | null = null
    let videoUrl: string | null = null

    if (file) mediaUrl = await upload(`media/${userId}/${ts}-${file.name}`, file)
    if (audioFile) audioUrl = await upload(`media/${userId}/${ts}-${audioFile.name}`, audioFile)
    if (videoFile) videoUrl = await upload(`media/${userId}/${ts}-${videoFile.name}`, videoFile)

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
        subgroup_id: subgroupId,
        views: 0,
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Create failed' }, { status: 500 })
  }
}


