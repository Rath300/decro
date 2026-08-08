'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { isPitchMode } from '@/lib/pitch-mode'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()
  const pitchMode = isPitchMode()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await signIn(email, password)
      if (result.success) {
        router.push(pitchMode ? '/' : '/feed')
        router.refresh()
      } else {
        setError(result.error || 'Sign in failed')
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
          Log in
        </h1>
        <p className="mt-3 text-sm text-black/60 leading-relaxed">
          Guests can still upload and comment. Log in for a profile and creating
          groups!
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className={label}>
              Email or username
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className={label}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-16`}
                placeholder="Your password"
                autoComplete="current-password"
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
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 space-y-3 text-xs">
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="block uppercase tracking-wide underline underline-offset-4 text-black/50 hover:text-black"
          >
            Forgot password
          </button>
          <p className="text-black/50">
            No account?{' '}
            <Link
              href="/signup"
              className="text-black underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
