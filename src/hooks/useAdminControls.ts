import { useCallback, useState } from 'react'
import { REVEAL_DURATION_MS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { GameSession, Question } from '@/types/game.types'

interface UseAdminControlsResult {
  startGame: (sessionId: string) => Promise<void>
  closeQuestion: (sessionId: string) => Promise<void>
  nextQuestion: (sessionId: string) => Promise<void>
  endGame: (sessionId: string) => Promise<void>
  createSession: () => Promise<GameSession>
  loading: boolean
  error: string | null
}

function getAdminErrorMessage(error: unknown): string {
  const fallback = 'Não foi possível executar a ação do admin.'
  if (!error) {
    return fallback
  }
  if (error instanceof Error) {
    const lowered = error.message.toLowerCase()
    if (lowered.includes('403') || lowered.includes('permission denied') || lowered.includes('forbidden')) {
      return 'Acesso negado. Faça login como administrador.'
    }
    return error.message
  }
  return fallback
}

export function useAdminControls(): UseAdminControlsResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSession = useCallback(async (): Promise<GameSession> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: createError } = await supabase
        .from('game_sessions')
        .insert({ status: 'waiting', current_question_index: 0 })
        .select('*')
        .single()

      if (createError || !data) {
        throw createError ?? new Error('Não foi possível criar a sessão.')
      }

      return data as GameSession
    } catch (nextError) {
      const message = getAdminErrorMessage(nextError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const startGame = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { data: firstQuestion, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (questionError || !firstQuestion) {
        throw questionError ?? new Error('Nenhuma pergunta cadastrada para iniciar o jogo.')
      }

      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          status: 'question',
          current_question_index: 0,
          current_question_id: (firstQuestion as Question).id,
          question_started_at: new Date().toISOString(),
          finished_at: null,
        })
        .eq('id', sessionId)

      if (updateError) {
        throw updateError
      }
    } catch (nextError) {
      const message = getAdminErrorMessage(nextError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const closeQuestion = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('current_question_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionError) {
        throw sessionError
      }

      const currentQuestionId = (sessionData as { current_question_id: string | null } | null)?.current_question_id
      if (!currentQuestionId) {
        throw new Error('Não há pergunta ativa para fechar.')
      }

      const { error: revealingError } = await supabase
        .from('game_sessions')
        .update({ status: 'revealing' })
        .eq('id', sessionId)

      if (revealingError) {
        throw revealingError
      }

      const { error: rpcError } = await supabase.rpc('calculate_question_result', {
        p_session_id: sessionId,
        p_question_id: currentQuestionId,
      })

      if (rpcError) {
        throw rpcError
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(() => resolve(), REVEAL_DURATION_MS)
      })

      const { error: resultError } = await supabase.from('game_sessions').update({ status: 'result' }).eq('id', sessionId)

      if (resultError) {
        throw resultError
      }
    } catch (nextError) {
      const message = getAdminErrorMessage(nextError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const nextQuestion = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('current_question_index')
        .eq('id', sessionId)
        .maybeSingle()

      if (sessionError || !sessionData) {
        throw sessionError ?? new Error('Sessão não encontrada.')
      }

      const currentIndex = Number((sessionData as { current_question_index: number }).current_question_index ?? 0)
      const nextIndex = currentIndex + 1
      const nextOrderIndex = nextIndex + 1

      const { data: nextQuestionData, error: nextQuestionError } = await supabase
        .from('questions')
        .select('*')
        .eq('order_index', nextOrderIndex)
        .maybeSingle()

      if (nextQuestionError) {
        throw nextQuestionError
      }

      if (!nextQuestionData) {
        const { error: finishError } = await supabase
          .from('game_sessions')
          .update({
            status: 'finished',
            finished_at: new Date().toISOString(),
            current_question_id: null,
            question_started_at: null,
          })
          .eq('id', sessionId)

        if (finishError) {
          throw finishError
        }
        return
      }

      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          status: 'question',
          current_question_index: nextIndex,
          current_question_id: (nextQuestionData as Question).id,
          question_started_at: new Date().toISOString(),
          finished_at: null,
        })
        .eq('id', sessionId)

      if (updateError) {
        throw updateError
      }
    } catch (nextError) {
      const message = getAdminErrorMessage(nextError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const endGame = useCallback(async (sessionId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('game_sessions')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (updateError) {
        throw updateError
      }
    } catch (nextError) {
      const message = getAdminErrorMessage(nextError)
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    startGame,
    closeQuestion,
    nextQuestion,
    endGame,
    createSession,
    loading,
    error,
  }
}
