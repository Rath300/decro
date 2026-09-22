import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo'
import TagPage from './tag-page-client'

type Props = { params: { tag: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = decodeURIComponent(params.tag)
  return pageMeta({
    title: tag,
    description: `Works tagged ${tag} on Decro.`,
    path: `/tags/${encodeURIComponent(tag)}`,
  })
}

export default function Page() {
  return <TagPage />
}
