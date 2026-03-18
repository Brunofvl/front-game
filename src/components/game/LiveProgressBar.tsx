interface LiveProgressBarProps {
  viktor: number
  lucas: number
  showLabels?: boolean
}

function normalize(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function LiveProgressBar({ viktor, lucas, showLabels = true }: LiveProgressBarProps): React.JSX.Element {
  const viktorPct = normalize(viktor)
  const lucasPct = normalize(lucas)
  const total = viktorPct + lucasPct
  const viktorWidth = total > 0 ? (viktorPct / total) * 100 : 50
  const lucasWidth = total > 0 ? (lucasPct / total) * 100 : 50

  return (
    <div className="space-y-2">
      {showLabels && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span>{`Viktor ${viktorPct.toFixed(1)}%`}</span>
          <span>{`Lucas ${lucasPct.toFixed(1)}%`}</span>
        </div>
      )}
      <div className="flex h-4 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-800">
        <div
          className="h-full bg-purple-600 transition-all duration-500"
          style={{ width: `${viktorWidth}%` }}
          aria-label={`Viktor ${viktorPct.toFixed(1)}%`}
        />
        <div
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: `${lucasWidth}%` }}
          aria-label={`Lucas ${lucasPct.toFixed(1)}%`}
        />
      </div>
    </div>
  )
}
