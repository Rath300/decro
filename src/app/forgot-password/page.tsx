'use client'

import Link from 'next/link'

// This page used to set `sent = true` on submit and display "Link sent!" without
// sending anything, so anyone who locked themselves out waited for an email that
// was never coming. Self-service reset needs an email provider, which is not
// configured yet, so say so instead of faking it.

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="forgot-password-card p-8">
        <h1 className="text-3xl text-black font-space-grotesk mb-6 text-center">
          Forgot Password
        </h1>

        <div className="space-y-4 text-center">
          <p className="text-black font-space-grotesk">
            Password reset by email isn&apos;t available yet.
          </p>
          <p className="text-sm text-gray-600 font-space-grotesk">
            If you&apos;re locked out, send us a note through the feedback page with
            the username on your account and we&apos;ll help you get back in.
          </p>

          <div className="pt-2 flex flex-col items-center gap-3">
            <Link
              href="/feedback"
              className="input-field bg-white text-black font-space-grotesk text-base border border-black hover:bg-black hover:text-white text-center"
            >
              Contact support
            </Link>
            <Link
              href="/"
              className="text-sm font-space-grotesk text-black hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
