/**
 * Storage Upload Utilities
 *
 * Uploads are authorised server-side. The browser asks /api/upload/sign for a
 * signed upload URL — which requires a session and enforces the MIME type and
 * size limit for the given kind — and then streams the file straight to storage
 * with that token. The bytes never pass through a route handler, so 500MB video
 * uploads still work.
 */

import supabase from './supabase-client'

export interface UploadResult {
  url: string
  path: string
}

type UploadKind = 'image' | 'audio' | 'video' | 'avatar'

/**
 * Compress an image before upload.
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      canvas.width = width
      canvas.height = height

      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to compress image'))
        }
      }, file.type, quality)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

async function uploadSigned(
  kind: UploadKind,
  body: Blob,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const response = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, fileName, contentType, size: body.size }),
  })

  const signed = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(signed?.error || 'Could not start upload')
  }

  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, body, {
      contentType,
      cacheControl: '3600',
    })

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(error.message || 'Failed to upload file')
  }

  return { url: signed.publicUrl, path: signed.path }
}

/**
 * Upload image to Supabase Storage. GIFs skip compression to keep animation.
 */
export async function uploadImage(file: File, _bucket = 'media'): Promise<UploadResult> {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
  const body = isGif ? file : await compressImage(file)
  const contentType = file.type || 'image/jpeg'

  return uploadSigned('image', body, file.name, contentType)
}

/**
 * Upload audio file to Supabase Storage.
 */
export async function uploadAudio(file: File, _bucket = 'media'): Promise<UploadResult> {
  return uploadSigned('audio', file, file.name, file.type || 'audio/mpeg')
}

/**
 * Upload video file to Supabase Storage.
 */
export async function uploadVideo(file: File, _bucket = 'media'): Promise<UploadResult> {
  return uploadSigned('video', file, file.name, file.type || 'video/mp4')
}

/**
 * Upload avatar image, compressed to a smaller size.
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  const compressed = await compressImage(file, 512, 0.9)
  return uploadSigned('avatar', compressed, file.name, file.type || 'image/jpeg')
}
