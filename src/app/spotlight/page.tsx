import dynamic from 'next/dynamic'
import { StaggeredMenu } from '@/components/StaggeredMenu'

const SpotlightPage = dynamic(() => import('@/components/spotlight-page'), { ssr: false })

export default function Spotlight() {
  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none">
        <StaggeredMenu
          position="right"
          sections={[
            {
              title: 'Subgroups',
              items: [
                { label: 'decro-music', link: '/subgroup/decro-music' },
                { label: 'visual-art', link: '/subgroup/visual-art' },
                { label: 'film', link: '/subgroup/film' },
              ],
            },
            {
              title: 'Feed',
              items: [
                { label: 'Kendrick live set in LA — 4K remaster', link: '/feed' },
                { label: 'A24 behind the scenes on DP choices ...', link: '/feed' },
                { label: 'New indie playlist drop (Sep)', link: '/feed' },
              ],
            },
          ]}
          socialItems={[]}
          displaySocials={false}
          displayItemNumbering={false}
          menuButtonColor="#000"
          openMenuButtonColor="#000"
          changeMenuColorOnOpen={true}
          colors={['#f5f5f5', '#e5e7eb']}
          logoUrl="/logo.svg"
          accentColor="#000"
        />
      </div>
      <SpotlightPage />
    </>
  )
}


