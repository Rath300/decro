'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import AppHeader from '@/components/AppHeader'
import VersionIndicator from '@/components/VersionIndicator'
import PitchChrome from '@/components/pitch/PitchChrome'
import PitchUploadHost from '@/components/pitch/PitchUploadHost'
import { isPitchMode } from '@/lib/pitch-mode'
import dynamic from 'next/dynamic'

const StaggeredMenu = dynamic(
  () => import('@/components/StaggeredMenu').then((m) => m.StaggeredMenu),
  { ssr: false }
)

const HIDE_HEADER_PATHS = new Set<string>(['/', '/signup', '/forgot-password'])

export default function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const { isAuthenticated } = useAuth()

  if (isPitchMode()) {
    return (
      <>
        <PitchChrome
          onUpload={() => {
            window.dispatchEvent(new Event('pitch:open-upload'))
          }}
          onPitch={() => {
            try {
              sessionStorage.removeItem('decro_pitch_onboarded_v2')
              sessionStorage.removeItem('decro_pitch_entered')
            } catch {}
            window.dispatchEvent(new Event('pitch:show-overlay'))
          }}
        />
        <div className="pt-14">{children}</div>
        <PitchUploadHost />
      </>
    )
  }

  const hide =
    HIDE_HEADER_PATHS.has(pathname) ||
    (!isAuthenticated && pathname.startsWith('/profile'))

  return (
    <>
      {!hide && (
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
              accentColor="#000"
              usePersonalizedData={true}
              logoUrl=""
            />
          </div>
          <AppHeader />
          <VersionIndicator />
        </>
      )}
      <div className={hide ? '' : 'pt-20'}>{children}</div>
    </>
  )
}
