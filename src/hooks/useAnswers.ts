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

      const startedAtMs = session.question_started_at ? new Date(session.question_started_at).getTime() : Date.now()
      const responseTimeMs = Math.max(0, Date.now() - startedAtMs)
      const answer: Omit<Answer, 'id' | 'answered_at'> & { answered_at?: string } = {
        session_id: session.id,
        question_id: currentQuestion.id,
        user_id: profile.id,
        team: profile.team,
        chosen_index: chosenIndex,
        is_correct: chosenIndex === currentQuestion.correct_index,
        response_time_ms: responseTimeMs,
      }

      const { data, error } = await supabase.from('answers').insert(answer).select('*').single()
      if (error) {
        if (error.code === '23505') {
          return
        }
        throw new Error('Não foi possível registrar sua resposta.')
      }
      if (data) {
        setMyAnswer(data)
      }
    },
    [currentQuestion, hasAnswered, profile, session, setMyAnswer],
  )

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
      if (error) {
        setMyAnswer(null)
        return
      }
      setMyAnswer(data)
    }

    void fetchMine()

    const channel = supabase
      .channel(`answers-${session.id}-${currentQuestion.id}-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'answers',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            return
          }
          const next = payload.new as Answer
          if (next.question_id === currentQuestion.id && next.user_id === profile.id) {
            setMyAnswer(next)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentQuestion?.id, profile, session?.id, setMyAnswer])

  return { submitAnswer, myAnswer, hasAnswered }
}
