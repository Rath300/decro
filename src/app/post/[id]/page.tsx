import type { Metadata } from 'next'
import JsonLd from '@/components/json-ld'
import {
  absoluteUrl,
  clip,
  first,
  loadPostSeo,
  pageMeta,
  siteOrigin,
} from '@/lib/seo'
import PostDetailPage from './post-page-client'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPostSeo(params.id)
  if (!post) {
    return pageMeta({
      title: 'Post',
      path: `/post/${params.id}`,
      index: false,
    })
  }
  const subgroup = first(post.subgroups as { name?: string } | { name?: string }[] | null)
  const title = post.title || 'Untitled'
  const description =
    clip(post.description, 160) ||
    (subgroup?.name ? `${title} in ${subgroup.name} on Decro.` : `${title} on Decro.`)
  return pageMeta({
    title,
    description,
    path: `/post/${post.id}`,
    image: post.media_url,
    type: 'article',
  })
}

export default async function Page({ params }: Props) {
  const post = await loadPostSeo(params.id)
  const subgroup = first(post?.subgroups as { name?: string; slug?: string } | { name?: string; slug?: string }[] | null)
  const creator = first(post?.profiles as { username?: string } | { username?: string }[] | null)
  const origin = siteOrigin()

  return (
    <>
      {post ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type':
              post.content_type === 'music'
                ? 'MusicRecording'
                : ['video', 'film'].includes(post.content_type || '')
                  ? 'VideoObject'
                  : post.content_type === 'text'
                    ? 'CreativeWork'
                    : 'VisualArtwork',
            name: post.title || 'Untitled',
            description: clip(post.description, 300),
            url: absoluteUrl(`/post/${post.id}`),
            image: post.media_url || undefined,
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            author: {
              '@type': 'Person',
              name: creator?.username || 'anonymous',
            },
            publisher: { '@id': `${origin}/#organization` },
            isPartOf: subgroup?.slug
              ? absoluteUrl(`/subgroup/${subgroup.slug}`)
              : `${origin}/#website`,
          }}
        />
      ) : null}
      <PostDetailPage />
    </>
  )
}
