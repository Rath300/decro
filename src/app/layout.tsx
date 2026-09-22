import type { Metadata } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'
import { PostProvider } from '@/context/post-context'
import { ToastContainer } from '@/components/toast'
import RootChrome from '@/components/RootChrome'
import ErrorBoundary from '@/components/ErrorBoundary'
import { ProfileInitializer } from '@/components/ProfileInitializer'
import JsonLd from '@/components/json-ld'
import {
  brandJsonLd,
  CANONICAL_ORIGIN,
  DEFAULT_OG_IMAGE,
  siteDescription,
  siteOrigin,
} from '@/lib/seo'

const GA_ID = 'G-TS03JV5TNX'
const description = siteDescription()

export const metadata: Metadata = {
  title: {
    default: 'Decro',
    template: '%s | Decro',
  },
  description,
  authors: [{ name: 'Decro' }],
  creator: 'Decro',
  publisher: 'Decro',
  applicationName: 'Decro',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(siteOrigin() || CANONICAL_ORIGIN),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Decro',
    title: 'Decro',
    description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Decro',
    description,
    images: [DEFAULT_OG_IMAGE.url],
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
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
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
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body>
        <JsonLd data={brandJsonLd()} />
        <ErrorBoundary>
          <ClientProviders>
            <ProfileInitializer>
              <PostProvider>
                <RootChrome>
                  {children}
                </RootChrome>
                <ToastContainer />
              </PostProvider>
            </ProfileInitializer>
          </ClientProviders>
        </ErrorBoundary>
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          // The old SW cache-first'd HTML and hashed Next chunks, which pinned
          // pre-security bundles after deploy. Register the kill-switch once so
          // it can wipe caches and unregister; do not keep a persistent SW.
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.getRegistrations().then((regs) => {
                if (regs.length === 0) return;
                navigator.serviceWorker.register('/sw.js?v=kill-1').catch(() => {});
              });
              if (window.caches && caches.keys) {
                caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
              }
            });
          }
        `,
          }}
        />
      </body>
    </html>
  )
} 