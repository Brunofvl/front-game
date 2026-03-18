import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSSE } from '@/hooks/useSSE'
import type { GameState } from '@/lib/sseClient'
import { useGameStore } from '@/store/gameStore'
import type { GameSession } from '@/types/game.types'

interface UseGameSessionResult {
  session: GameSession | null
  loading: boolean
  error: string | null
}

interface UseGameSessionOptions {
  sessionId?: string | null
  navigateByStatus?: boolean
  includeFinished?: boolean
}

function getRouteByStatus(status: GameSession['status']): string {
  if (status === 'waiting') {
    return '/waiting'
  }
  if (status === 'question' || status === 'revealing') {
    return '/question'
  }
  if (status === 'result' || status === 'finished') {
    return '/result'
  }
  return '/waiting'
}

export function useGameSession(options?: UseGameSessionOptions): UseGameSessionResult {
  const navigate = useNavigate()
  const location = useLocation()
  const sessionId = options?.sessionId ?? null
  const navigateByStatus = options?.navigateByStatus ?? true
  const includeFinished = options?.includeFinished ?? false
  const prevStatusRef = useRef<GameSession['status'] | null>(null)
  const session = useGameStore((state) => state.session)
  const setSession = useGameStore((state) => state.setSession)
  const setCurrentQuestion = useGameStore((state) => state.setCurrentQuestion)
  const { data, error } = useSSE<GameState>()

  useEffect(() => {
    const nextSession = data?.session ?? null
    const matchesSession = !sessionId || nextSession?.id === sessionId
    const allowedByStatus = includeFinished || nextSession?.status !== 'finished'
    const filteredSession = matchesSession && allowedByStatus ? nextSession : null

    setSession(filteredSession)
  }, [data?.session, includeFinished, sessionId, setSession])

  useEffect(() => {
    const nextQuestion = data?.current_question ?? null
    const nextSession = data?.session ?? null
    const matchesSession = !sessionId || nextSession?.id === sessionId
    const allowedByStatus = includeFinished || nextSession?.status !== 'finished'

    if (!matchesSession || !allowedByStatus) {
      setCurrentQuestion(null)
      return
    }

    setCurrentQuestion(nextQuestion)
  }, [data?.current_question, data?.session, includeFinished, sessionId, setCurrentQuestion])

  useEffect(() => {
    if (!navigateByStatus || !session) {
      return
    }
    if (session.status === prevStatusRef.current) {
      return
    }
    prevStatusRef.current = session.status
    const nextRoute = getRouteByStatus(session.status)
    if (location.pathname !== nextRoute) {
      navigate(nextRoute, { replace: true })
    }
  }, [location.pathname, navigate, navigateByStatus, session])

  return {
    session,
    loading: data === null,
    error,
  }
}
