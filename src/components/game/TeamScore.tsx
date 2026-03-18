import { TEAM_COLORS, TEAM_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Team } from '@/types/game.types'

interface TeamScoreProps {
  team: Team
  correct: number
  total: number
  pct: number
  isWinner: boolean
}

export function TeamScore({ team, correct, total, pct, isWinner }: TeamScoreProps): React.JSX.Element {
  const styles = TEAM_COLORS[team]
  const teamLabel = TEAM_LABELS[team]
  const percentValue = Math.max(0, Math.min(100, Math.round(pct)))

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4 transition-all duration-500',
        isWinner
          ? `scale-105 animate-bounce border-4 ${styles.border} bg-slate-900 shadow-2xl`
          : `opacity-60 ${styles.border} bg-slate-900/80`,
      )}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pulse rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-slate-900">
          VENCEDOR 🏆
        </div>
      )}
      <p className={`mt-2 text-xl font-bold ${styles.text}`}>{teamLabel}</p>
      <p className="mt-2 text-sm text-slate-300">{`${correct} de ${total} acertaram`}</p>
      <p className="mt-3 text-5xl font-black text-white">{`${percentValue}%`}</p>
      <div className="mt-4 h-3 w-full rounded-full bg-slate-800">
        <div className={cn('h-3 rounded-full transition-all duration-500', styles.bg)} style={{ width: `${percentValue}%` }} />
      </div>
    </div>
  )
}
