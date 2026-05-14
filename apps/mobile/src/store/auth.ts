import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { User, AuthResponse } from '@zuiphok/shared'
import { api } from '../services/api'

const TOKEN_KEY = 'auth_token'

interface AuthState {
  token: string | null
  user: User | null
  isLoaded: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoaded: false,

  login: async (email, password) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password })
    const { token, user } = res.data
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    set({ token, user })
  },

  register: async (name, email, password) => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password })
    const { token, user } = res.data
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    set({ token, user })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    set({ token: null, user: null })
  },

  loadSession: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (!token) return

      const res = await api.get<{ user: User }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      set({ token, user: res.data.user })
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
    } finally {
      set({ isLoaded: true })
    }
  },
}))
