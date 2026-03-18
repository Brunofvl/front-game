import { useEffect } from 'react'
import { useSSE } from '@/hooks/useSSE'
import type { GameState } from '@/lib/sseClient'
import { useGameStore } from '@/store/gameStore'
import type { SessionPlayer } from '@/types/game.types'

export function useSessionPlayers(sessionId: string | null): SessionPlayer[] {
  const { data } = useSSE<GameState>()
  const players = useGameStore((state) => state.players)
  const setPlayers = useGameStore((state) => state.setPlayers)

  useEffect(() => {
    if (!data || !sessionId) {
      setPlayers([])
      return
    }

    if (data.session?.id !== sessionId) {
      return
    }

    setPlayers(data.players ?? [])
  }, [data, sessionId, setPlayers])

  useEffect(() => {
    if (!sessionId) {
      setPlayers([])
    }
  }, [sessionId, setPlayers])

  return players
}
