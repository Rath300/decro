/**
 * Storage Upload Utilities
 * Handles media uploads to Supabase Storage
 */

import supabase from './supabase-client'

export interface UploadResult {
  url: string
  path: string
}

/**
 * Compress an image before upload
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    img.onload = () => {
      let width = img.width
      let height = img.height
      
      // Calculate new dimensions
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
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

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    // Compress image before upload
    const compressed = await compressImage(file)
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `images/${fileName}`
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, compressed, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    throw new Error('Failed to upload image')
  }
}

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudio(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `audio/${fileName}`
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Audio upload failed:', error)
    throw new Error('Failed to upload audio')
  }
}

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideo(file: File, bucket = 'media'): Promise<UploadResult> {
  try {
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `videos/${fileName}`
    
    // Upload to storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)
    
    return {
      url: publicUrl,
      path: filePath
    }
  } catch (error) {
    console.error('Video upload failed:', error)
    throw new Error('Failed to upload video')
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  try {
    // Compress to smaller size for avatars
    const compressed = await compressImage(file, 512, 0.9)
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = fileName
    
    // Upload to media bucket in avatars folder
    const { data, error } = await supabase.storage
      .from('media')
      .upload(`avatars/${filePath}`, compressed, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(`avatars/${filePath}`)
    
    return {
      url: publicUrl,
      path: `avatars/${filePath}`
    }
  } catch (error) {
    console.error('Avatar upload failed:', error)
    throw new Error('Failed to upload avatar')
  }
}

/**
 * Delete file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  } catch (error) {
    console.error('File deletion failed:', error)
    throw new Error('Failed to delete file')
  }
}


