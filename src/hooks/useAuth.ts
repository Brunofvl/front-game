import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useGameStore } from '@/store/gameStore'
import type { Profile, Team } from '@/types/game.types'

interface UseAuthResult {
  profile: Profile | null
  loading: boolean
  loginAsPlayer: (name: string, team: Team) => Promise<void>
  loginAsAdmin: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  onAuthStateChange: () => Promise<() => void>
}

export function useAuth(autoInit = false): UseAuthResult {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setGameProfile = useGameStore((state) => state.setProfile)
  const [loading, setLoading] = useState(false)

  const syncProfile = useCallback(
    (nextProfile: Profile | null) => {
      setProfile(nextProfile)
      setGameProfile(nextProfile)
    },
    [setGameProfile, setProfile],
  )

  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) {
        throw new Error('Não foi possível carregar o perfil.')
      }
      return (data as Profile | null) ?? null
    },
    [],
  )

  const loginAsPlayer = useCallback(
    async (name: string, team: Team) => {
      setLoading(true)
      try {
        const trimmedName = name.trim()
        if (trimmedName.length < 2) {
          throw new Error('Informe um nome válido para entrar no jogo.')
        }

        const { data, error } = await supabase.auth.signInAnonymously()
        if (error || !data.user) {
          if (error?.code === 'anonymous_provider_disabled') {
            throw new Error('O login de vendedor está desativado no Supabase. Ative "Anonymous Sign-ins" em Authentication > Settings.')
          }
          throw new Error(error?.message ?? 'Falha ao entrar como jogador. Tente novamente.')
        }

        const payload = {
          id: data.user.id,
          name: trimmedName,
          team,
          role: 'player' as const,
        }

        const { error: profileError } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
        if (profileError) {
          throw new Error('Não foi possível salvar seu perfil de jogador.')
        }

        const nextProfile = await fetchProfile(data.user.id)
        if (!nextProfile) {
          throw new Error('Perfil do jogador não encontrado após o login.')
        }

        syncProfile(nextProfile)
        navigate('/waiting', { replace: true })
      } finally {
        setLoading(false)
      }
    },
    [fetchProfile, navigate, syncProfile],
  )

  const loginAsAdmin = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.user) {
          throw new Error('Credenciais inválidas para acesso de admin.')
        }

        const nextProfile = await fetchProfile(data.user.id)
        if (!nextProfile) {
          await supabase.auth.signOut()
          throw new Error('Perfil de admin não encontrado.')
        }

        if (nextProfile.role !== 'admin') {
          await supabase.auth.signOut()
          throw new Error('Este usuário não possui permissão de administrador.')
        }

        syncProfile(nextProfile)
        navigate('/admin', { replace: true })
      } finally {
        setLoading(false)
      }
    },
    [fetchProfile, navigate, syncProfile],
  )

  const logout = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw new Error('Não foi possível finalizar sua sessão.')
      }
      syncProfile(null)
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [navigate, syncProfile])

  const onAuthStateChange = useCallback(async () => {
    setLoading(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      try {
        const existingProfile = await fetchProfile(session.user.id)
        syncProfile(existingProfile)
      } catch {
        syncProfile(null)
      }
    } else {
      syncProfile(null)
    }
    setLoading(false)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, nextSession) => {
      if (!nextSession?.user) {
        syncProfile(null)
        return
      }

      try {
        const existingProfile = await fetchProfile(nextSession.user.id)
        syncProfile(existingProfile)
      } catch {
        syncProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, syncProfile])

  useEffect(() => {
    if (!autoInit) {
      return
    }

    let unsubscribe: (() => void) | undefined
    void onAuthStateChange().then((cleanup) => {
      unsubscribe = cleanup
    })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [autoInit, onAuthStateChange])

  return {
    profile,
    loading,
    loginAsPlayer,
    loginAsAdmin,
    logout,
    onAuthStateChange,
  }
}
