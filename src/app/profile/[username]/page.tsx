import type { Metadata } from 'next'
import JsonLd from '@/components/json-ld'
import { absoluteUrl, clip, loadProfileSeo, pageMeta, siteOrigin } from '@/lib/seo'
import PublicProfilePage from './profile-page-client'

type Props = { params: { username: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = decodeURIComponent(params.username).trim()
  const profile = await loadProfileSeo(username)
  if (!profile) {
    return pageMeta({
      title: username,
      path: `/profile/${encodeURIComponent(username)}`,
      index: false,
    })
  }
  const title = profile.full_name || profile.username
  return pageMeta({
    title,
    description: clip(profile.bio, 160) || `${profile.username} on Decro.`,
    path: `/profile/${encodeURIComponent(profile.username)}`,
    image: profile.avatar_url,
  })
}

export default async function Page({ params }: Props) {
  const username = decodeURIComponent(params.username).trim()
  const profile = await loadProfileSeo(username)
  const origin = siteOrigin()

  return (
    <>
      {profile ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name: profile.full_name || profile.username,
            url: absoluteUrl(`/profile/${encodeURIComponent(profile.username)}`),
            mainEntity: {
              '@type': 'Person',
              name: profile.full_name || profile.username,
              alternateName: profile.username,
              description: clip(profile.bio, 300) || undefined,
              image: profile.avatar_url || undefined,
            },
            isPartOf: { '@id': `${origin}/#website` },
          }}
        />
      ) : null}
      <PublicProfilePage />
    </>
  )
}
