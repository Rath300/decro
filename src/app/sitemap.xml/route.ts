import supabase from '@/lib/supabase-client'
import { isPitchMode } from '@/lib/pitch-mode'

// Subgroup slugs and usernames are interpolated into XML, so a name containing
// & or < would produce a document no crawler can parse.
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

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.decro.net'
  const pitch = isPitchMode()

  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    const { data: subgroups } = await supabase
      .from('subgroups')
      .select('slug, updated_at')
      .limit(100)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .not('username', 'is', null)
      .limit(1000)

    const staticPitch = `
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/signup</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/create</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`

    const staticFull = `
  <url>
    <loc>${baseUrl}/feed</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/trending</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/spotlight</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/subgroup</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/create</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  ${pitch ? staticPitch : staticFull}

  <!-- Posts -->
  ${posts?.map((post) => `
  <url>
    <loc>${baseUrl}/post/${post.id}</loc>
    <lastmod>${new Date(post.updated_at || post.created_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('') || ''}

  <!-- Subgroups -->
  ${subgroups?.map((subgroup) => `
  <url>
    <loc>${escapeXml(`${baseUrl}/${urlPath('subgroup', subgroup.slug)}`)}</loc>
    <lastmod>${new Date(subgroup.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('') || ''}

  <!-- Profiles -->
  ${profiles?.map((profile) => `
  <url>
    <loc>${escapeXml(`${baseUrl}/${urlPath('profile', profile.username)}`)}</loc>
    <lastmod>${new Date(profile.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('') || ''}
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
