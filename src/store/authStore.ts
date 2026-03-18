// Store de autenticação simplificada para controlar perfil logado e permissões.
import { create } from 'zustand'
import type { Profile } from '@/types/game.types'

interface AuthState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  isAdmin: () => boolean
  isPlayer: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  isAdmin: () => get().profile?.role === 'admin',
  isPlayer: () => get().profile?.role === 'player',
}))
