import type { Metadata } from 'next'
import './globals.css'
import { PostProvider } from '@/context/post-context'
import { AuthProvider } from '@/context/auth-context'

export const metadata: Metadata = {
  title: 'Decro - Sign Up',
  description: 'Create your Decro account',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <PostProvider>
            {children}
          </PostProvider>
        </AuthProvider>
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