import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'
import { PostProvider } from '@/context/post-context'
import { ToastContainer } from '@/components/toast'
import RootChrome from '@/components/RootChrome'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: {
    default: 'Decro - Creative Social Platform',
    template: '%s | Decro'
  },
  description: 'Share your creativity with the world. A social platform for artists, musicians, photographers, and creators. No algorithm, just authentic content.',
  keywords: ['social media', 'creative platform', 'art sharing', 'music sharing', 'photography', 'creators', 'portfolio'],
  authors: [{ name: 'Decro' }],
  creator: 'Decro',
  publisher: 'Decro',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://decro.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Decro',
    title: 'Decro - Creative Social Platform',
    description: 'Share your creativity with the world. A social platform for artists, musicians, photographers, and creators.',
    images: [
      {
        url: '/decky.png',
        width: 1200,
        height: 630,
        alt: 'Decro - Creative Social Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decro - Creative Social Platform',
    description: 'Share your creativity with the world. A social platform for artists, musicians, and creators.',
    images: ['/decky.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/decky.png' },
      { url: '/decky.png', sizes: '32x32', type: 'image/png' },
      { url: '/decky.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/decky.png',
    apple: '/decky.png',
  },
  verification: {
    // Add these when you have them:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body>
        <ErrorBoundary>
          <ClientProviders>
            <PostProvider>
              <RootChrome>
                {children}
              </RootChrome>
              <ToastContainer />
            </PostProvider>
          </ClientProviders>
        </ErrorBoundary>
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