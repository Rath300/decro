import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

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


