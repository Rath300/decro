'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSession as useNextAuthSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'
import { callRpc } from '@/lib/rpc'

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useNextAuthSession()
  const loading = status === 'loading'

  const user: User | null = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name
  } : null

  // Ensure a profile row exists and update display fields from auth.
  React.useEffect(() => {
    if (!session?.user || typeof window === 'undefined') return

    callRpc('upsert_profile_from_external', {
      username_param:
        session.user.name || session.user.email?.split('@')[0] || 'user',
      full_name_param: session.user.name || null,
    }).then(({ error }) => {
      if (error) console.error('Profile upsert failed:', error.message)
    })
  }, [session?.user?.id])

  const signIn = async (email: string, password: string) => {
    try {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
      }
      
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        return { success: true }
      } else {
        return { success: false, error: result?.error || 'Invalid email or password' }
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message || 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      if (!password || !name) {
        return { success: false, error: 'Password and username are required' }
      }
      
      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
      }
      
      // Call signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || '' }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Sign up failed' }
      }

      // Auto sign-in after signup
      const signInResult = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        return { success: true }
      } else {
        return { success: false, error: 'User created but automatic sign-in failed. Please sign in manually.' }
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { success: false, error: error.message || 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false })
      console.log('Sign out successful')
    } catch (error) {
      console.error('Sign out failed:', error)
      // Don't throw - let the UI handle it gracefully
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    // During prerendering, return a default empty auth state instead of throwing
    if (typeof window === 'undefined') {
      return {
        user: null,
        loading: true,
        isAuthenticated: false,
        signIn: async () => ({ success: false, error: 'Not initialized' }),
        signUp: async () => ({ success: false, error: 'Not initialized' }),
        signOut: async () => {},
      }
    }
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
