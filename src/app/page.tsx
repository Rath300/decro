'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import LoginForm from '@/components/login-form'

export default function Home() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/feed')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black font-['Space_Mono']">Loading...</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Will redirect via useEffect
  }

  return <LoginForm />
}