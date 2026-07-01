import { create } from 'zustand'
import type { User } from '../lib/types'

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem('pool_token', token)
    localStorage.setItem('pool_user', JSON.stringify(user))
    set({ user, token })
  },

  clearAuth: () => {
    localStorage.removeItem('pool_token')
    localStorage.removeItem('pool_user')
    set({ user: null, token: null })
  },

  hydrate: () => {
    const token = localStorage.getItem('pool_token')
    const userStr = localStorage.getItem('pool_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User
        set({ user, token })
      } catch { /* ignore */ }
    }
  },
}))
