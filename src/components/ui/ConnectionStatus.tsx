import { useEffect, useRef, useState } from 'react'
import { sseClient } from '@/lib/sseClient'

export function ConnectionStatus(): React.JSX.Element | null {
  const [connected, setConnected] = useState(sseClient.connected)
  const [showConnectedBadge, setShowConnectedBadge] = useState(false)
  const previousConnectedRef = useRef(sseClient.connected)
  const hideTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    sseClient.connect()
    const unsubscribe = sseClient.subscribeConnection((nextConnected) => {
      setConnected(nextConnected)
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      if (!nextConnected) {
        setShowConnectedBadge(false)
        previousConnectedRef.current = nextConnected
        return
      }
      if (!previousConnectedRef.current && nextConnected) {
        setShowConnectedBadge(true)
        hideTimeoutRef.current = window.setTimeout(() => setShowConnectedBadge(false), 2000)
      }
      previousConnectedRef.current = nextConnected
    })
    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current)
      }
      unsubscribe()
      sseClient.disconnectIfIdle()
    }
  }, [])

  const visible = !connected || showConnectedBadge
  if (!visible) {
    return null
  }

  if (connected) {
    return (
      <div className="pointer-events-none fixed right-4 top-4 z-50 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
          Conectado
        </span>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
      🔴 Reconectando...
    </div>
  )
}
