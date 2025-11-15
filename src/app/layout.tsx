import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'
import { PostProvider } from '@/context/post-context'
import { ToastContainer } from '@/components/toast'
import RootChrome from '@/components/RootChrome'

export const metadata: Metadata = {
  title: 'Decro - Sign Up',
  description: 'Create your Decro account',
  icons: {
    icon: '/decky.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          <PostProvider>
            <RootChrome>
              {children}
            </RootChrome>
            <ToastContainer />
          </PostProvider>
        </ClientProviders>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
      </body>
    </html>
  )
} 