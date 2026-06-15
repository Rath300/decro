import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import supabase from '@/lib/supabase-client'
import { authOptions } from '@/lib/auth'
import { uploadFileToStorage } from '@/lib/server-upload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('query') || '').trim()
    if (!q) return NextResponse.json({ items: [] })

    const { data, error } = await supabase
      .from('subgroups')
      .select('id,name,slug')
      .or(`name.ilike.*${q}*,slug.ilike.*${q}*`)
      .limit(20)

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to create a subgroup' }, { status: 401 })
    }

    const form = await req.formData()
    const name = String(form.get('name') || '').trim()
    const slug = String(form.get('slug') || '').trim()
    const description = String(form.get('description') || '').trim()
    const coverFile = form.get('coverFile') as File | null

    let coverUrl: string | null = null
    if (coverFile && coverFile.size > 0) {
      const uploaded = await uploadFileToStorage(coverFile, {
        folder: 'covers',
        maxBytes: 5 * 1024 * 1024,
      })
      coverUrl = uploaded.url
    }

    const { data, error } = await supabase.rpc('create_subgroup_ext', {
      external_id_param: session.user.id,
      name_param: name,
      slug_param: slug,
      description_param: description || null,
      cover_image_url_param: coverUrl,
    })

    if (error) {
      console.error('create_subgroup_ext RPC failed:', error)
      return NextResponse.json({ error: error.message || 'Failed to create subgroup' }, { status: 500 })
    }

    const result = data as { success?: boolean; error?: string; slug?: string }
    if (!result?.success) {
      return NextResponse.json({ error: result?.error || 'Failed to create subgroup' }, { status: 400 })
    }

    return NextResponse.json({ slug: result.slug, success: true })
  } catch (e: any) {
    console.error('Create subgroup failed:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create subgroup' }, { status: 500 })
  }
}
