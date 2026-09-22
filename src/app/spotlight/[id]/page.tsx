import type { Metadata } from 'next'
import { loadSpotlightSeo, pageMeta } from '@/lib/seo'
import SpotlightDetailPage from './spotlight-page-client'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const spotlight = await loadSpotlightSeo(params.id)
  if (!spotlight) {
    return pageMeta({
      title: 'Spotlight',
      path: `/spotlight/${params.id}`,
      index: false,
    })
  }
  return pageMeta({
    title: spotlight.title || 'Spotlight',
    description: spotlight.description || `${spotlight.title} — a Decro spotlight.`,
    path: `/spotlight/${spotlight.id}`,
    image: spotlight.cover_image_url,
  })
}

export default function Page() {
  return <SpotlightDetailPage />
}
