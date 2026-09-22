import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

/** Canonical production host. www and vercel.app should 301 here. */
export const CANONICAL_ORIGIN = 'https://decro.net'

export function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_ORIGIN).trim()
  return raw.replace(/\/+$/, '')
}

export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path
  const origin = siteOrigin()
  if (!path || path === '/') return `${origin}/`
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export function isPitchSeo(): boolean {
  return process.env.NEXT_PUBLIC_PITCH_MODE === 'true'
}

export function siteDescription(): string {
  return isPitchSeo()
    ? 'Explore Decro’s creative web — connect groups, upload work, and find your niche. No algorithm, just creators.'
    : 'Share your creativity with the world. A social platform for artists, musicians, photographers, and creators. No algorithm, just authentic content.'
}

export function clip(text: string | null | undefined, max = 160): string {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trimEnd()}…`
}

export const DEFAULT_OG_IMAGE = {
  url: '/decky.png',
  width: 1200,
  height: 630,
  alt: 'Decro',
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function pageMeta({
  title,
  description,
  path,
  image,
  index = true,
  type = 'website',
}: {
  title: string
  description?: string
  path: string
  image?: string | null
  index?: boolean
  type?: 'website' | 'article'
}): Metadata {
  const desc = clip(description || siteDescription())
  const url = absoluteUrl(path)
  const branded = title === 'Decro' ? 'Decro' : `${title} | Decro`
  const ogImage = image
    ? { url: image, alt: title }
    : DEFAULT_OG_IMAGE

  return {
    title: title === 'Decro' ? { absolute: 'Decro' } : title,
    description: desc,
    alternates: { canonical: url },
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type,
      locale: 'en_US',
      url,
      siteName: 'Decro',
      title: branded,
      description: desc,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: branded,
      description: desc,
      images: [image || DEFAULT_OG_IMAGE.url],
    },
  }
}

export const noIndexMeta = (title: string, path = '/'): Metadata =>
  pageMeta({ title, path, index: false })

export function brandJsonLd(): Record<string, unknown> {
  const origin = siteOrigin()
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'Decro',
        alternateName: ['decro', 'decro.net'],
        url: `${origin}/`,
        logo: absoluteUrl('/decky.png'),
        email: 'helpdecro.net@gmail.com',
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'Decro',
        alternateName: ['decro', 'decro.net'],
        url: `${origin}/`,
        description: siteDescription(),
        publisher: { '@id': `${origin}/#organization` },
        inLanguage: 'en-US',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${origin}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

export async function loadPostSeo(id: string) {
  const db = publicClient()
  if (!db) return null
  const { data } = await db
    .from('posts')
    .select(
      'id, title, description, content_type, media_url, audio_url, video_url, created_at, updated_at, subgroups ( name, slug ), profiles!posts_creator_id_fkey ( username )'
    )
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function loadSubgroupSeo(slug: string) {
  const db = publicClient()
  if (!db) return null
  const { data } = await db
    .from('subgroups')
    .select('id, name, slug, description, post_count')
    .eq('slug', slug)
    .maybeSingle()
  return data
}

export async function loadProfileSeo(username: string) {
  const db = publicClient()
  if (!db) return null
  const { data } = await db
    .from('profiles')
    .select('username, full_name, bio, avatar_url')
    .eq('username', username)
    .maybeSingle()
  return data
}

export async function loadSpotlightSeo(id: string) {
  const db = publicClient()
  if (!db) return null
  const { data } = await db
    .from('spotlight_collections')
    .select('id, title, description, cover_image_url')
    .eq('id', id)
    .maybeSingle()
  return data
}

export function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}
