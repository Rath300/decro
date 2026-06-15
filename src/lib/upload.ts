/**
 * Storage Upload Utilities
 * Handles media uploads to Supabase Storage
 */

import supabase from './supabase-client'

export interface UploadResult {
  url: string
  path: string
}

const CANVAS_OUTPUT_TYPE = 'image/jpeg'

function getFileExtension(file: File, fallback = 'jpg'): string {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || ext === file.name.toLowerCase()) return fallback
  return ext
}

/**
 * Compress an image before upload
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    const cleanup = () => URL.revokeObjectURL(objectUrl)

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

      canvas.toBlob(
        (blob) => {
          cleanup()
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        CANVAS_OUTPUT_TYPE,
        quality
      )
    }

    img.onerror = () => {
      cleanup()
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

async function prepareImageForUpload(file: File): Promise<{ blob: Blob | File; contentType: string; extension: string }> {
  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif')
  if (isGif) {
    return {
      blob: file,
      contentType: file.type || 'image/gif',
      extension: getFileExtension(file, 'gif'),
    }
  }

  try {
    const compressed = await compressImage(file)
    return {
      blob: compressed,
      contentType: CANVAS_OUTPUT_TYPE,
      extension: 'jpg',
    }
  } catch (compressionError) {
    console.warn('Image compression failed, uploading original file:', compressionError)
    return {
      blob: file,
      contentType: file.type || 'image/jpeg',
      extension: getFileExtension(file, 'jpg'),
    }
  }
}

/**
 * Upload image via authenticated server API (bypasses client storage issues)
 */
export async function uploadImageViaApi(
  file: File,
  folder: 'images' | 'covers' | 'avatars' = 'images'
): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)
  form.append('folder', folder)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: form,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to upload image')
  }

  return payload as UploadResult
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 50MB')
    }

    const { blob, contentType, extension } = await prepareImageForUpload(file)
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`
    const filePath = `images/${fileName}`

    const { error } = await supabase.storage.from(bucket).upload(filePath, blob, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error: any) {
    console.error('Image upload failed:', error)
    throw new Error(error.message || 'Failed to upload image')
  }
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudio(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    const MAX_FILE_SIZE = 100 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Audio file size must be less than 100MB')
    }

    const fileExt = getFileExtension(file, 'mp3')
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `audio/${fileName}`

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type || 'audio/mpeg',
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error: any) {
    console.error('Audio upload failed:', error)
    throw new Error(error.message || 'Failed to upload audio')
  }
}

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideo(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    const MAX_FILE_SIZE = 500 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Video file size must be less than 500MB')
    }

    const fileExt = getFileExtension(file, 'mp4')
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `videos/${fileName}`

    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      contentType: file.type || 'video/mp4',
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath)

    return {
      url: publicUrl,
      path: filePath,
    }
  } catch (error: any) {
    console.error('Video upload failed:', error)
    throw new Error(error.message || 'Failed to upload video')
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  try {
    return uploadImageViaApi(file, 'avatars')
  } catch (error: any) {
    console.error('Avatar upload failed:', error)
    throw new Error(error.message || 'Failed to upload avatar')
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) throw error
  } catch (error) {
    console.error('File deletion failed:', error)
    throw new Error('Failed to delete file')
  }
}
