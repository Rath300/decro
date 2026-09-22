import type { Metadata } from 'next'
import JsonLd from '@/components/json-ld'
import { absoluteUrl, clip, loadSubgroupSeo, pageMeta, siteOrigin } from '@/lib/seo'
import SubgroupDetail from './subgroup-page-client'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const group = await loadSubgroupSeo(params.slug)
  if (!group) {
    return pageMeta({
      title: 'Group',
      path: `/subgroup/${params.slug}`,
      index: false,
    })
  }
  const count = typeof group.post_count === 'number' ? group.post_count : null
  const description =
    clip(group.description, 160) ||
    `${group.name} on Decro${count != null ? ` — ${count} work${count === 1 ? '' : 's'}` : ''}.`
  return pageMeta({
    title: group.name,
    description,
    path: `/subgroup/${group.slug}`,
  })
}

export default async function Page({ params }: Props) {
  const group = await loadSubgroupSeo(params.slug)
  const origin = siteOrigin()

  return (
    <>
      {group ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: group.name,
            description: clip(group.description, 300) || `${group.name} on Decro.`,
            url: absoluteUrl(`/subgroup/${group.slug}`),
            isPartOf: { '@id': `${origin}/#website` },
          }}
        />
      ) : null}
      <SubgroupDetail />
    </>
  )
}
