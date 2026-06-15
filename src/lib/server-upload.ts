import { getSupabaseAdmin } from './supabase-admin'

export interface ServerUploadResult {
  url: string
  path: string
}

function getExtension(filename: string, fallback: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext || ext === filename.toLowerCase()) return fallback
  return ext
}

export async function uploadFileToStorage(
  file: File,
  options: { folder: string; bucket?: string; maxBytes?: number }
): Promise<ServerUploadResult> {
  const bucket = options.bucket ?? 'media'
  const maxBytes = options.maxBytes ?? 50 * 1024 * 1024

  if (file.size > maxBytes) {
    throw new Error(`File size must be less than ${Math.round(maxBytes / (1024 * 1024))}MB`)
  }

  const ext = getExtension(file.name, 'jpg')
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
  const filePath = `${options.folder}/${fileName}`
  const contentType = file.type || 'application/octet-stream'
  const buffer = Buffer.from(await file.arrayBuffer())

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    throw new Error(error.message || 'Storage upload failed')
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

  return { url: publicUrl, path: filePath }
}
