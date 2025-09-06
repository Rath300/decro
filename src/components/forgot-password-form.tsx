'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    setTimeout(() => {
      setMessage('Link sent! Check your email for password reset instructions.')
      setLoading(false)
    }, 1000)
  }

  const handleSignInClick = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="forgot-password-card p-6 sm:p-8 lg:p-12">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-black text-left mb-4 sm:mb-6 lg:mb-8 font-space-grotesk">
          Forgot Password?
        </h1>

        <p className="text-lg sm:text-xl lg:text-2xl font-normal text-black text-left mb-6 sm:mb-8 lg:mb-10 font-space-grotesk">
          Enter your email to reset your password
        </p>

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">{message}</div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-normal text-black font-space-grotesk">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="input-field bg-white text-black font-space-grotesk text-base font-normal border border-black hover:bg-black hover:text-white active:bg-black active:text-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm font-normal text-black font-space-grotesk">
            Remember Password?{' '}
            <button onClick={handleSignInClick} className="font-bold text-black hover:underline transition-colors cursor-pointer">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
 






