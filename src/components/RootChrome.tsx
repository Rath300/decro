'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import AppHeader from '@/components/AppHeader'
import VersionIndicator from '@/components/VersionIndicator'
import PitchChrome from '@/components/pitch/PitchChrome'
import PitchUploadHost from '@/components/pitch/PitchUploadHost'
import SiteStatsCounter from '@/components/SiteStatsCounter'
import { isPitchMode } from '@/lib/pitch-mode'
import dynamic from 'next/dynamic'

const StaggeredMenu = dynamic(
  () => import('@/components/StaggeredMenu').then((m) => m.StaggeredMenu),
  { ssr: false }
)

const HIDE_HEADER_PATHS = new Set<string>(['/', '/signup', '/forgot-password'])

export default function RootChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  if (isPitchMode()) {
    return (
      <>
        <PitchChrome
          onUpload={() => {
            window.dispatchEvent(new Event('pitch:open-upload'))
          }}
          onHome={() => {
            // Duck: home + collapse web to main groups (not the tutorial)
            try {
              sessionStorage.setItem('decro_pitch_reset_web', '1')
            } catch {}
            if (pathname === '/') {
              window.dispatchEvent(new Event('pitch:reset-web'))
            } else {
              router.push('/')
            }
          }}
          onTutorial={() => {
            try {
              sessionStorage.removeItem('decro_pitch_onboarded_v7')
              sessionStorage.removeItem('decro_pitch_onboarded_v6')
              sessionStorage.removeItem('decro_pitch_onboarded_v5')
              sessionStorage.removeItem('decro_pitch_onboarded_v4')
              sessionStorage.removeItem('decro_pitch_onboarded_v3')
              sessionStorage.removeItem('decro_pitch_onboarded_v2')
              sessionStorage.removeItem('decro_pitch_entered')
              sessionStorage.setItem('decro_pitch_restart_tour', '1')
            } catch {}
            if (pathname === '/') {
              window.dispatchEvent(new Event('pitch:show-overlay'))
            } else {
              router.push('/')
            }
          }}
        />
        <SiteStatsCounter />
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
