import { useMemo } from 'react'
import { useSSE } from '@/hooks/useSSE'
import type { GameState } from '@/lib/sseClient'
import type { GameStatus } from '@/types/game.types'

interface LiveStats {
  totalPlayers: number
  answeredCount: number
  answeredPct: number
  viktorAnswered: number
  lucasAnswered: number
  viktorCorrectPct: number
  lucasCorrectPct: number
}

const initialStats: LiveStats = {
  totalPlayers: 0,
  answeredCount: 0,
  answeredPct: 0,
  viktorAnswered: 0,
  lucasAnswered: 0,
  viktorCorrectPct: 0,
  lucasCorrectPct: 0,
}

export function useLiveStats(sessionId: string | null, questionId: string | null, status: GameStatus): LiveStats {
  const { data } = useSSE<GameState>()
  void sessionId
  void questionId
  void status

  return useMemo(
    () => ({
      totalPlayers: data?.answer_stats?.total_players ?? initialStats.totalPlayers,
      answeredCount: data?.answer_stats?.answered_count ?? initialStats.answeredCount,
      answeredPct: data?.answer_stats?.answered_pct ?? initialStats.answeredPct,
      viktorAnswered: data?.answer_stats?.viktor_answered ?? initialStats.viktorAnswered,
      lucasAnswered: data?.answer_stats?.lucas_answered ?? initialStats.lucasAnswered,
      viktorCorrectPct: data?.answer_stats?.viktor_correct_pct ?? initialStats.viktorCorrectPct,
      lucasCorrectPct: data?.answer_stats?.lucas_correct_pct ?? initialStats.lucasCorrectPct,
    }),
    [data?.answer_stats],
  )
}
