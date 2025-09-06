'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { client } from '@/lib/auth-client'
import { useUserStore } from '@/store/user-store'

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const setUserStore = useUserStore(state => state.setUser)

  useEffect(() => {
    // Check if user is already signed in
    const checkSession = async () => {
      try {
        const session = await client.getSession()
        if (session?.user) {
          const u = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name
          }
          setUser(u)
          setUserStore(u)
        }
      } catch (error) {
        console.error('Session check failed:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const result = await client.signIn.email({
        email,
        password,
      })

      if (result.data?.user) {
        const u = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name
        }
        setUser(u)
        setUserStore(u)
        return { success: true }
      } else {
        return { success: false, error: result.error?.message || 'Sign in failed' }
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const result = await client.signUp.email({
        email,
        password,
        name,
      })

      if (result.data?.user) {
        const u = {
          id: result.data.user.id,
          email: result.data.user.email,
          name: result.data.user.name
        }
        setUser(u)
        setUserStore(u)
        return { success: true }
      } else {
        return { success: false, error: result.error?.message || 'Sign up failed' }
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signOut = async () => {
    try {
      await client.signOut()
      setUser(null)
      setUserStore(null)
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
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 