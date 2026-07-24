import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { uploadFileToStorage } from '@/lib/server-upload'
import supabase from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const raw = (searchParams.get('query') || '').trim()
    if (!raw) return NextResponse.json({ items: [] })

    // The query was interpolated straight into an `.or()` filter, where commas,
    // parentheses, dots and `*` are PostgREST syntax — a crafted query could
    // rewrite the filter. Keep alphanumerics, spaces and separators, plus any
    // non-ASCII character so subgroup names outside Latin script still match.
    const q = Array.from(raw)
      .filter((ch) => /[a-zA-Z0-9 _-]/.test(ch) || ch.charCodeAt(0) > 127)
      .join('')
      .slice(0, 60)

    if (!q) return NextResponse.json({ items: [] })

    const { data, error } = await supabase
      .from('subgroups')
      .select('id,name,slug')
      .or(`name.ilike.*${q}*,slug.ilike.*${q}*`)
      .limit(20)

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    console.error('[api/subgroups] search failed:', e?.message)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to create a subgroup' },
        { status: 401 }
      )
    }

    const form = await req.formData()
    const name = String(form.get('name') || '').trim()
    const slug = String(form.get('slug') || '').trim()
    const description = String(form.get('description') || '').trim()
    const coverFile = form.get('coverFile') as File | null

    if (!name || name.length < 3) {
      return NextResponse.json(
        { error: 'Name must be at least 3 characters' },
        { status: 400 }
      )
    }

    if (!slug || slug.length < 3) {
      return NextResponse.json(
        { error: 'Slug must be at least 3 characters' },
        { status: 400 }
      )
    }

    let coverUrl: string | null = null
    if (coverFile && coverFile.size > 0) {
      const uploaded = await uploadFileToStorage(coverFile, {
        folder: 'covers',
        maxBytes: 5 * 1024 * 1024,
      })
      coverUrl = uploaded.url
    }

    // service_role: create_subgroup_ext is revoked from anon (migration 037).
    // Identity comes from the verified session, not the request body.
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('create_subgroup_ext', {
      external_id_param: session.user.id,
      name_param: name,
      slug_param: slug,
      description_param: description || null,
      cover_image_url_param: coverUrl,
    })

    if (error) {
      console.error('create_subgroup_ext RPC failed:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create subgroup' },
        { status: 500 }
      )
    }

    const result = data as { success?: boolean; error?: string; slug?: string }
    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to create subgroup' },
        { status: 400 }
      )
    }

    return NextResponse.json({ slug: result.slug, success: true })
  } catch (e: any) {
    console.error('Create subgroup failed:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to create subgroup' },
      { status: 500 }
    )
  }
}
