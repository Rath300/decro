import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase-client'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const u = (searchParams.get('u') || '').trim()
    if (!u) return NextResponse.json({ error: 'missing username' }, { status: 400 })

    const { data, error } = await supabase
      .from('user')
      .select('email')
      .ilike('name', u)
      .limit(1)
      .single()
    if (error || !data?.email) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ email: data.email })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}


