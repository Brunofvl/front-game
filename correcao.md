Correções
Correção 1 — Remova o Realtime do useAnswers.ts
O useEffect com supabase.channel no final do hook precisa ser removido — ele não é mais necessário já que o SSE já traz o estado atualizado. Substitua o arquivo por este:
import { useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useGameStore } from '@/store/gameStore'
import type { Answer } from '@/types/game.types'

interface UseAnswersResult {
  submitAnswer: (chosenIndex: number) => Promise<void>
  myAnswer: Answer | null
  hasAnswered: boolean
}

export function useAnswers(): UseAnswersResult {
  const profile = useAuthStore((state) => state.profile)
  const session = useGameStore((state) => state.session)
  const currentQuestion = useGameStore((state) => state.currentQuestion)
  const myAnswer = useGameStore((state) => state.myAnswer)
  const setMyAnswer = useGameStore((state) => state.setMyAnswer)
  const hasAnswered = myAnswer !== null

  const submitAnswer = useCallback(
    async (chosenIndex: number) => {
      if (!profile || !profile.team || !session?.id || !currentQuestion || hasAnswered) {
        return
      }

      const startedAtMs = session.question_started_at
        ? new Date(session.question_started_at).getTime()
        : Date.now()
      const responseTimeMs = Math.max(0, Date.now() - startedAtMs)

      const answer = {
        session_id: session.id,
        question_id: currentQuestion.id,
        user_id: profile.id,
        team: profile.team,
        chosen_index: chosenIndex,
        is_correct: chosenIndex === currentQuestion.correct_index,
        response_time_ms: responseTimeMs,
      }

      const { data, error } = await supabase
        .from('answers')
        .insert(answer)
        .select('*')
        .single()

      if (error) {
        if (error.code === '23505') return // já respondeu, ignora
        throw new Error('Não foi possível registrar sua resposta.')
      }
      if (data) setMyAnswer(data)
    },
    [currentQuestion, hasAnswered, profile, session, setMyAnswer],
  )

  // Recupera resposta já existente ao montar (ex: usuário recarregou a página)
  useEffect(() => {
    if (!profile || !session?.id || !currentQuestion?.id) {
      setMyAnswer(null)
      return
    }

    const fetchMine = async () => {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('session_id', session.id)
        .eq('question_id', currentQuestion.id)
        .eq('user_id', profile.id)
        .maybeSingle()

      if (!error) setMyAnswer(data)
    }

    void fetchMine()
  }, [currentQuestion?.id, profile?.id, session?.id, setMyAnswer])

  return { submitAnswer, myAnswer, hasAnswered }
}