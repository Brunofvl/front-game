import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnswerButton } from '@/components/game/AnswerButton'
import { QuestionCard } from '@/components/game/QuestionCard'
import { Timer } from '@/components/game/Timer'
import { useAnswers } from '@/hooks/useAnswers'
import { useGameSession } from '@/hooks/useGameSession'
import { QUESTION_DURATION_MS, TEAM_LABELS } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import { useGameStore } from '@/store/gameStore'
import type { Question } from '@/types/game.types'

const fallbackQuestion: Question = {
  id: 'q1',
  text: 'Qual é o principal objetivo desta rodada?',
  options: ['Aumentar acurácia', 'Ganhar velocidade', 'Responder em equipe', 'Todas as alternativas'],
  correct_index: 3,
  order_index: 0,
  video_url_viktor: null,
  video_url_lucas: null,
}

export default function QuestionPage(): React.JSX.Element {
  const navigate = useNavigate()
  const profile = useAuthStore((state) => state.profile)
  const { session } = useGameSession()
  const currentQuestion = useGameStore((state) => state.currentQuestion)
  const question = useMemo(() => currentQuestion ?? fallbackQuestion, [currentQuestion])
  const { submitAnswer, myAnswer, hasAnswered } = useAnswers()
  const [submitting, setSubmitting] = useState(false)
  const [timeExpired, setTimeExpired] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(10)
  const [showQuestion, setShowQuestion] = useState(false)

  useEffect(() => {
    const index = session?.current_question_index ?? 0
    setTotalQuestions((current) => Math.max(current, index + 1))
  }, [session?.current_question_index])

  useEffect(() => {
    if (session?.status === 'result') {
      navigate('/result', { replace: true })
    }
  }, [navigate, session?.status])

  useEffect(() => {
    setTimeExpired(false)
  }, [question.id, session?.question_started_at])

  useEffect(() => {
    setShowQuestion(false)
    const timeout = window.setTimeout(() => setShowQuestion(true), 20)
    return () => window.clearTimeout(timeout)
  }, [question.id])

  const handleSelect = async (index: number): Promise<void> => {
    if (!profile?.team || hasAnswered || timeExpired || submitting) {
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitAnswer(index)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível enviar sua resposta.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExpire = async (): Promise<void> => {
    if (hasAnswered) {
      return
    }
    setTimeExpired(true)
    setSubmitError(null)
    try {
      await submitAnswer(-1)
    } catch {
      setSubmitError('Tempo esgotado!')
    }
  }

  const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
  const options = question.options.slice(0, 4)

  const getButtonState = (index: number): 'idle' | 'selected' | 'correct' | 'wrong' | 'disabled' => {
    if (session?.status === 'revealing') {
      if (index === question.correct_index) {
        return 'correct'
      }
      if (myAnswer && myAnswer.chosen_index === index && !myAnswer.is_correct) {
        return 'wrong'
      }
      return 'disabled'
    }

    if (hasAnswered) {
      if (myAnswer?.chosen_index === index) {
        return 'selected'
      }
      return 'disabled'
    }

    if (timeExpired || submitting) {
      return 'disabled'
    }

    return 'idle'
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <p className="text-sm font-semibold">{profile?.name ?? 'Jogador'}</p>
          <p className="text-xs text-slate-300">{profile?.team ? TEAM_LABELS[profile.team] : 'Sem equipe'}</p>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6">
        {session?.question_started_at ? (
          <Timer
            durationMs={QUESTION_DURATION_MS}
            startedAt={session.question_started_at}
            onExpire={() => void handleExpire()}
            paused={hasAnswered || session.status === 'revealing' || session.status === 'result'}
          />
        ) : (
          <p className="text-center text-sm text-slate-400">Aguardando...</p>
        )}

        <div
          className={`transition-all duration-300 ${showQuestion ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
        >
          <QuestionCard
            question={question}
            questionIndex={(session?.current_question_index ?? question.order_index) + 1}
            totalQuestions={totalQuestions}
          />
        </div>

        <div className="grid gap-3">
          {options.map((option, index) => (
            <AnswerButton
              key={`${question.id}-${index}`}
              index={index}
              text={option}
              state={getButtonState(index)}
              onClick={() => void handleSelect(index)}
              letter={letters[index] ?? 'A'}
            />
          ))}
        </div>

        {timeExpired && !hasAnswered && <p className="text-center text-sm font-semibold text-red-300">Tempo esgotado!</p>}
        {submitError && <p className="text-center text-sm text-red-300">{submitError}</p>}
      </section>

      {myAnswer && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900/95 p-4 text-center shadow-2xl">
            <p className="text-lg font-bold">
              {myAnswer.is_correct
                ? '✓ Resposta enviada!'
                : session?.status === 'revealing' || session?.status === 'result'
                  ? '✗ Resposta enviada'
                  : 'Resposta enviada!'}
            </p>
            <p className="mt-1 text-sm text-slate-300">{`Você respondeu em ${(myAnswer.response_time_ms / 1000).toFixed(1)}s`}</p>
            {myAnswer.is_correct && myAnswer.response_time_ms <= 5000 && <p className="mt-1 text-sm text-emerald-300">⚡ Muito rápido!</p>}
          </div>
        </div>
      )}
    </main>
  )
}
