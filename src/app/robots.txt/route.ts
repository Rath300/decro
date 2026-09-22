import supabase from '@/lib/supabase-client';

export async function GET() {
  // Fetch all AI-protected user content paths
  const { data: protectedProfiles } = await supabase
    .from('profiles')
    .select('username')
    .eq('ai_training_opt_out', true);

  const disallowedPaths = protectedProfiles 
    ? protectedProfiles.map(p => `Disallow: /profile/${p.username}`).join('\n')
    : '';

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
  ];

  const aiBlockRules = aiCrawlers.map(bot => `
User-agent: ${bot}
Disallow: /api/
Disallow: /profile/
Disallow: /post/
Disallow: /feed
Disallow: /trending
${disallowedPaths}
`).join('\n');

  const robotsTxt = `${aiBlockRules}

User-agent: *
Allow: /

Sitemap: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://decro.vercel.app'}/sitemap.xml`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}

