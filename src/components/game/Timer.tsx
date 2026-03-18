import { useEffect, useMemo, useRef, useState } from 'react'

interface TimerProps {
  durationMs: number
  startedAt: string
  onExpire: () => void
  paused?: boolean
}

export function Timer({ durationMs, startedAt, onExpire, paused = false }: TimerProps): React.JSX.Element {
  const [remainingMs, setRemainingMs] = useState(durationMs)
  const hasExpiredRef = useRef(false)

  useEffect(() => {
    hasExpiredRef.current = false
  }, [startedAt, durationMs])

  useEffect(() => {
    if (paused) {
      return
    }

    const update = () => {
      const elapsed = Date.now() - new Date(startedAt).getTime()
      const nextRemaining = Math.max(0, durationMs - elapsed)
      setRemainingMs(nextRemaining)
      if (nextRemaining === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true
        onExpire()
      }
    }

    update()
    const interval = window.setInterval(update, 100)
    return () => window.clearInterval(interval)
  }, [durationMs, onExpire, paused, startedAt])

  const percentage = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100))
  const seconds = Math.ceil(remainingMs / 1000)

  const barColorClass = useMemo(() => {
    if (seconds <= 5) {
      return 'bg-red-500'
    }
    if (seconds <= 10) {
      return 'bg-yellow-400'
    }
    return 'bg-green-500'
  }, [seconds])

  return (
    <div className="space-y-3">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400">Tempo</p>
        <p className="text-5xl font-black text-white">{seconds}</p>
      </div>
      <div className="h-3 w-full rounded-full bg-slate-800">
        <div
          className={`h-3 rounded-full transition-all duration-100 ${barColorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
