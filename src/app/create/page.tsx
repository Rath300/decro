import dynamic from 'next/dynamic'
import { StaggeredMenu } from '@/components/StaggeredMenu'
import Identity from '@/components/Identity'

const CreatePostPage = dynamic(() => import('@/components/create-post-page'), { ssr: false })

export default function Create() {
  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <StaggeredMenu
          position="right"
          sections={[]}
          socialItems={[]}
          displaySocials={false}
          displayItemNumbering={false}
          menuButtonColor="#000"
          openMenuButtonColor="#000"
          changeMenuColorOnOpen={true}
          colors={['#f5f5f5', '#e5e7eb']}
          logoUrl="/logo.svg"
          accentColor="#000"
          usePersonalizedData={true}
        />
      </div>
      <div className="fixed top-3 left-4 z-50 pointer-events-auto">
        <Identity />
      </div>
      <CreatePostPage />
    </>
  )
}


