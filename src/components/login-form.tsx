'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSignIn()
  }

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    const result = await signIn(email, password)

    if (result.success) {
      router.push('/feed')
    } else {
      setError(result.error || 'Sign in failed')
    }

    setLoading(false)
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword)
  const handleSignUpClick = () => router.push('/signup')
  const handleForgotPasswordClick = () => router.push('/forgot-password')

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="login-card p-6 sm:p-8 lg:p-12">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal text-black text-center mb-6 sm:mb-8 lg:mb-12 font-['Space_Grotesk']">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-4 w-full flex flex-col items-center">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-normal text-black font-['Space_Grotesk']">Email or Username</label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email or username"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-normal text-black font-['Space_Grotesk']">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-600 font-['Space_Grotesk']">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={loading}
            className="input-field bg-white text-black font-['Space_Grotesk'] text-base font-normal border border-black hover:bg-black hover:text-white active:bg-black active:text-white transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <button type="button" onClick={handleForgotPasswordClick} className="text-sm font-normal text-black font-['Space_Grotesk'] hover:underline transition-colors cursor-pointer">
            Forgot Password?
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm font-normal text-black font-['Space_Grotesk']">
            Don't Have an Account?{' '}
            <button type="button" onClick={handleSignUpClick} className="font-bold text-black hover:underline transition-colors cursor-pointer">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
} 
