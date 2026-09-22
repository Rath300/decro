import supabase from '@/lib/supabase-client'
import { siteOrigin } from '@/lib/seo'

export async function GET() {
  const { data: protectedProfiles } = await supabase
    .from('profiles')
    .select('username')
    .eq('ai_training_opt_out', true)

  const disallowedPaths = protectedProfiles
    ? protectedProfiles.map((p) => `Disallow: /profile/${p.username}`).join('\n')
    : ''

  const aiCrawlers = [
    'GPTBot',
    'ChatGPT-User',
    'CCBot',
    'anthropic-ai',
    'Claude-Web',
    'ClaudeBot',
    'Google-Extended',
    'GoogleOther',
    'PerplexityBot',
    'Bytespider',
    'Applebot-Extended',
    'Meta-ExternalAgent',
    'FacebookBot',
    'cohere-ai',
    'Diffbot',
    'ImagesiftBot',
    'OmgiliBot',
    'Timpibot',
  ]

  const aiBlockRules = aiCrawlers
    .map(
      (bot) => `
User-agent: ${bot}
Disallow: /api/
Disallow: /profile/
Disallow: /post/
Disallow: /feed
Disallow: /trending
${disallowedPaths}
`
    )
    .join('\n')

  const origin = siteOrigin()
  const robotsTxt = `${aiBlockRules}

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: *
Allow: /
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /settings
Disallow: /messages
Disallow: /create
Disallow: /profile/edit
Disallow: /post/edit
Disallow: /subgroup/create
Disallow: /spotlight/create
Disallow: /api/

Sitemap: ${origin}/sitemap.xml`

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
