'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // For now, mimic success per spec
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="forgot-password-card p-8">
        <h1 className="text-3xl text-black font-space-grotesk mb-6 text-center">Forgot Password</h1>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm text-black font-space-grotesk">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field focus:outline-none focus:ring-2 focus:ring-blue-500 font-space-grotesk"
                placeholder="Enter your email"
              />
            </div>
            <button type="submit" className="input-field bg-white text-black font-space-grotesk text-base border border-black hover:bg-black hover:text-white">Send Reset Link</button>
            <Link href="/" className="text-sm font-space-grotesk text-black hover:underline">Back to Sign In</Link>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-black font-space-grotesk">Link sent!</p>
            <Link href="/" className="mt-4 inline-block text-sm font-space-grotesk text-black underline">Return to Sign In</Link>
          </div>
        )}
      </div>
    </main>
  )
}



