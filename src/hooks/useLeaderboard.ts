import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/store/gameStore'
import type { LeaderboardEntry } from '@/types/game.types'

interface UseLeaderboardResult {
  entries: LeaderboardEntry[]
  loading: boolean
  fetchForQuestion: (questionId: string, sessionId: string) => Promise<void>
}

export function useLeaderboard(): UseLeaderboardResult {
  const entries = useGameStore((state) => state.leaderboard)
  const setLeaderboard = useGameStore((state) => state.setLeaderboard)
  const [loading, setLoading] = useState(false)

  const fetchForQuestion = useCallback(
    async (questionId: string, sessionId: string) => {
      setLoading(true)
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .order('speed_rank', { ascending: true })
        .limit(5)

      if (error) {
        setLeaderboard([])
        setLoading(false)
        return
      }

      const sorted = ((data ?? []) as LeaderboardEntry[]).sort((a, b) => a.speed_rank - b.speed_rank)
      setLeaderboard(sorted)
      setLoading(false)
    },
    [setLeaderboard],
  )

  return {
    entries,
    loading,
    fetchForQuestion,
  }
}
