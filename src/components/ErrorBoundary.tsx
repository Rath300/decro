/**
 * Error Boundary Component
 * Catches React errors and displays fallback UI
 */

'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-white flex items-center justify-center font-['Space_Mono']">
          <div className="max-w-md w-full mx-4 border-2 border-black p-8 bg-white text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-black mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-100 p-3 mb-4 overflow-auto max-h-32 border border-gray-300">
                {this.state.error.message}
              </pre>
            )}
            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full px-4 py-3 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/feed'}
                className="w-full px-4 py-3 border border-black text-black hover:bg-gray-50 transition-colors"
              >
                Go to Feed
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

