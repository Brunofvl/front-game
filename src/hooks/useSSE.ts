import { useEffect, useState } from 'react'
import { sseClient, type GameState } from '@/lib/sseClient'

interface UseSSEResult<T> {
  data: T | null
  connected: boolean
  error: string | null
}

export function useSSE<T = GameState>(): UseSSEResult<T> {
  const [data, setData] = useState<T | null>((sseClient.lastState as T | null) ?? null)
  const [connected, setConnected] = useState<boolean>(sseClient.connected)
  const [error, setError] = useState<string | null>(sseClient.error)

  useEffect(() => {
    sseClient.connect()
    const unsubscribeData = sseClient.subscribe((nextState) => {
      setData(nextState as T)
    })
    const unsubscribeConnection = sseClient.subscribeConnection(setConnected)
    const unsubscribeError = sseClient.subscribeError(setError)

    return () => {
      unsubscribeData()
      unsubscribeConnection()
      unsubscribeError()
      sseClient.disconnectIfIdle()
    }
  }, [])

  return {
    data,
    connected,
    error,
  }
}
