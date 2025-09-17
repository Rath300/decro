import { create } from 'zustand'

type User = { id: string; email: string; name?: string } | null

interface UserState {
  user: User
  setUser: (user: User) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))



