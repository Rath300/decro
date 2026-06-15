import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { uploadFileToStorage } from '@/lib/server-upload'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_FOLDERS = new Set(['images', 'covers', 'avatars', 'audio', 'videos'])

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'You must be signed in to upload files' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const folder = String(form.get('folder') || 'images')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
    }

    const maxBytes = folder === 'avatars' || folder === 'covers' ? 5 * 1024 * 1024 : undefined
    const result = await uploadFileToStorage(file, { folder, maxBytes })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Upload API failed:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
