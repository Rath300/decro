import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('query') || '').trim()
    if (!q) return NextResponse.json({ items: [] })

    // Search by name or slug (case-insensitive)
    const { data, error } = await supabase
      .from('subgroups')
      .select('id,name,slug')
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
      .limit(20)

    if (error) throw error
    return NextResponse.json({ items: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Search failed' }, { status: 500 })
  }
}


