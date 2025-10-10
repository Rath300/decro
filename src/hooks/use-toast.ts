/**
 * Toast Hook
 * Simple toast notification system
 */

import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (message, type, duration = 3000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, message, type, duration }
    
    set((state) => ({
      toasts: [...state.toasts, toast]
    }))
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      }, duration)
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },
  
  clearAll: () => {
    set({ toasts: [] })
  }
}))

export function useToast() {
  const { addToast } = useToastStore()
  
  return {
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration)
  }
}


