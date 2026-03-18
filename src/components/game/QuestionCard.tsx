import type { Question } from '@/types/game.types'

interface QuestionCardProps {
  question: Question
  questionIndex: number
  totalQuestions: number
}

export function QuestionCard({ question, questionIndex, totalQuestions }: QuestionCardProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6">
      <p className="text-sm text-slate-400">{`Pergunta ${questionIndex} de ${totalQuestions}`}</p>
      <h2 className="mt-4 text-center text-2xl font-bold text-white md:text-3xl">{question.text}</h2>
    </div>
  )
}
