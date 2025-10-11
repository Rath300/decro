import dynamic from 'next/dynamic'

const CreatePostPage = dynamic(() => import('@/components/create-post-page'), { ssr: false })

export default function Create() {
  return (
    <>
      <CreatePostPage />
    </>
  )
}


