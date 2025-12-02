'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useSession as useNextAuthSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react'

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

  // Ensure a profile row exists and update display fields from auth
  if (session?.user && typeof window !== 'undefined') {
    // fire-and-forget; avoid blocking render
    fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/upsert_profile_from_external', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        external_id_param: session.user.id,
        username_param: session.user.name || session.user.email?.split('@')[0] || null,
        full_name_param: session.user.name || null
      })
    }).catch((error) => {
      console.warn('Profile upsert failed (non-critical):', error)
    })
  }

  const signIn = async (email: string, password: string) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        return { success: true }
      } else {
        return { success: false, error: result?.error || 'Sign in failed' }
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
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
        return { success: false, error: 'User created but sign-in failed' }
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false })
    } catch (error) {
      console.error('Sign out failed:', error)
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
