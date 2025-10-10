/**
 * Toast Component
 * Displays toast notifications
 */

'use client'

import { useToastStore } from '@/hooks/use-toast'
import { useEffect } from 'react'

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: any; onClose: () => void }) {
  useEffect(() => {
    // Slide in animation
    const el = document.getElementById(`toast-${toast.id}`)
    if (el) {
      setTimeout(() => {
        el.style.transform = 'translateX(0)'
        el.style.opacity = '1'
      }, 10)
    }
  }, [toast.id])
  
  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[toast.type] || 'bg-gray-800'
  
  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }[toast.type] || ''
  
  return (
    <div
      id={`toast-${toast.id}`}
      className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md pointer-events-auto transition-all duration-300 ease-out`}
      style={{ transform: 'translateX(400px)', opacity: 0 }}
    >
      <span className="text-xl font-bold">{icon}</span>
      <p className="flex-1 font-['Space_Mono'] text-sm">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 font-bold text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}


