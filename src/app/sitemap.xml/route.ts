import supabase from '@/lib/supabase-client'
import { isPitchMode } from '@/lib/pitch-mode'
import { siteOrigin } from '@/lib/seo'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function urlPath(...segments: string[]) {
  return segments.map((s) => encodeURIComponent(s)).join('/')
}

function loc(href: string, lastmod?: string | null, changefreq = 'weekly', priority = '0.6') {
  const mod = lastmod
    ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`
    : ''
  return `  <url>
    <loc>${escapeXml(href)}</loc>${mod}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

async function fetchAll<T>(
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; from < 50_000; from += pageSize) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1)
    if (table === 'posts') {
      query = query.order('created_at', { ascending: false })
    }
    if (table === 'profiles') {
      query = query.not('username', 'is', null)
    }
    const { data, error } = await query
    if (error || !data?.length) break
    rows.push(...(data as T[]))
    if (data.length < pageSize) break
  }
  return rows
}

export async function GET() {
  const baseUrl = siteOrigin()
  const pitch = isPitchMode()

  try {
    const [posts, subgroups, profiles] = await Promise.all([
      fetchAll<{ id: string; created_at: string; updated_at: string | null }>(
        'posts',
        'id, created_at, updated_at'
      ),
      fetchAll<{ slug: string; updated_at: string | null }>('subgroups', 'slug, updated_at'),
      fetchAll<{ username: string; updated_at: string | null }>(
        'profiles',
        'username, updated_at'
      ),
    ])

    const staticUrls = [
      loc(`${baseUrl}/`, null, 'hourly', '1.0'),
      loc(`${baseUrl}/updates`, null, 'weekly', '0.6'),
      ...(pitch
        ? []
        : [
            loc(`${baseUrl}/feed`, null, 'hourly', '0.9'),
            loc(`${baseUrl}/trending`, null, 'hourly', '0.8'),
            loc(`${baseUrl}/spotlight`, null, 'daily', '0.7'),
            loc(`${baseUrl}/subgroup`, null, 'daily', '0.7'),
            loc(`${baseUrl}/algorithm`, null, 'monthly', '0.4'),
          ]),
    ]

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
${posts
  .map((post) =>
    loc(
      `${baseUrl}/post/${post.id}`,
      post.updated_at || post.created_at,
      'weekly',
      '0.8'
    )
  )
  .join('\n')}
${subgroups
  .map((subgroup) =>
    loc(
      `${baseUrl}/${urlPath('subgroup', subgroup.slug)}`,
      subgroup.updated_at,
      'weekly',
      '0.7'
    )
  )
  .join('\n')}
${profiles
  .map((profile) =>
    loc(
      `${baseUrl}/${urlPath('profile', profile.username)}`,
      profile.updated_at,
      'weekly',
      '0.5'
    )
  )
  .join('\n')}
</urlset>`

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response('Error generating sitemap', { status: 500 })
  }
}
