'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { isPitchMode } from '@/lib/pitch-mode'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signUp } = useAuth()
  const pitchMode = isPitchMode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')
    try {
      const result = await signUp(email, password, username)
      if (result.success) {
        router.push(pitchMode ? '/' : '/feed')
        router.refresh()
      } else {
        setError(result.error || 'Sign up failed')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const field =
    'w-full border border-black px-3 py-2.5 text-sm font-["Space_Mono"] bg-white outline-none'
  const label =
    'block text-[10px] uppercase tracking-wide text-black/45 mb-2 font-["Space_Mono"]'

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white font-['Space_Mono'] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-black p-6 sm:p-8">
        {pitchMode && (
          <Link
            href="/"
            className="inline-block text-[10px] uppercase tracking-wide text-black/45 hover:text-black mb-6"
          >
            ← Creative web
          </Link>
        )}

        <p className="text-[10px] uppercase tracking-wide text-black/40">
          Account
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-normal uppercase tracking-tight">
          Sign up
        </h1>
        <p className="mt-3 text-sm text-black/60 leading-relaxed">
          Create a name for your profile. Email is optional.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className={label}>
              Email <span className="normal-case text-black/30">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="username" className={label}>
              Username *
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
              placeholder="yourname"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className={label}>
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-16`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-black/40 hover:text-black"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className={label}>
              Confirm password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${field} pr-16`}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-black/40 hover:text-black"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-700 border border-red-700 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-black bg-black text-white py-2.5 text-xs uppercase tracking-wide hover:bg-white hover:text-black disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-xs text-black/50">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-black underline underline-offset-4"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
