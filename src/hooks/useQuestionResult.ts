import { useEffect } from 'react'
import { useSSE } from '@/hooks/useSSE'
import type { GameState } from '@/lib/sseClient'
import { useGameStore } from '@/store/gameStore'
import type { LeaderboardEntry, QuestionResult } from '@/types/game.types'

interface UseQuestionResultResult {
  result: QuestionResult | null
  leaderboard: LeaderboardEntry[]
  loading: boolean
}

export function useQuestionResult(sessionId: string | null, questionId: string | null): UseQuestionResultResult {
  const result = useGameStore((state) => state.questionResult)
  const setQuestionResult = useGameStore((state) => state.setQuestionResult)
  const setLeaderboard = useGameStore((state) => state.setLeaderboard)
  const leaderboard = useGameStore((state) => state.leaderboard)
  const { data } = useSSE<GameState>()

  useEffect(() => {
    const state = data
    if (!state || !sessionId || !questionId) {
      setQuestionResult(null)
      setLeaderboard([])
      return
    }

    if (state.session?.id !== sessionId || state.session.current_question_id !== questionId) {
      return
    }

    setQuestionResult((state.question_result as QuestionResult | null) ?? null)
    setLeaderboard(state.leaderboard ?? [])
  }, [data, questionId, sessionId, setLeaderboard, setQuestionResult])

  return {
    result,
    leaderboard,
    loading: result === null,
  }
}
