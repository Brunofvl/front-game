import { cn } from '@/lib/utils'

type AnswerVisualState = 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled'

interface AnswerButtonProps {
  index: number
  text: string
  state: AnswerVisualState
  onClick: () => void
  letter: 'A' | 'B' | 'C' | 'D'
}

const idleColors = ['bg-red-600', 'bg-blue-600', 'bg-yellow-500', 'bg-green-600']

export function AnswerButton({ index, text, state, onClick, letter }: AnswerButtonProps): React.JSX.Element {
  const isDisabled = state === 'disabled' || state === 'correct' || state === 'wrong'
  const idleColor = idleColors[index] ?? 'bg-slate-700'

  const containerClass = cn(
    'relative flex min-h-[72px] w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-white transition-all duration-100 active:scale-95',
    state === 'idle' && idleColor,
    state === 'selected' && `${idleColor} scale-[1.01] border-4 border-white`,
    state === 'correct' && 'bg-green-500',
    state === 'wrong' && 'bg-slate-800 opacity-50',
    state === 'disabled' && 'cursor-not-allowed bg-slate-700 opacity-60',
  )

  return (
    <button type="button" className={containerClass} onClick={onClick} disabled={isDisabled}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-black/30 text-lg font-bold">{letter}</span>
      <span className="flex-1 text-lg font-semibold leading-tight">{text}</span>
      {state === 'correct' && <span className="text-2xl font-black">✓</span>}
      {state === 'wrong' && <span className="text-2xl font-black">✗</span>}
    </button>
  )
}
