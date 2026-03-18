import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeamScore } from '@/components/game/TeamScore'
import { VideoPlayer } from '@/components/game/VideoPlayer'
import { useQuestionResult } from '@/hooks/useQuestionResult'
import { useGameSession } from '@/hooks/useGameSession'
import { TEAM_LABELS } from '@/lib/constants'
import { useGameStore } from '@/store/gameStore'
import type { Team } from '@/types/game.types'

interface SessionSummary {
  viktorWins: number
  lucasWins: number
  winnerTeam: Team | null
}

interface MvpSummary {
  name: string
  team: Team
  averageMs: number
}

function formatTime(ms: number): string {
  const base = (ms / 1000).toFixed(1)
  return `${base.replace(/\.0$/, '')}s`
}

function getRankStyle(position: number): string {
  if (position === 1) {
    return 'text-yellow-400'
  }
  if (position === 2) {
    return 'text-gray-300'
  }
  if (position === 3) {
    return 'text-orange-400'
  }
  return 'text-white'
}

function getRankEmoji(position: number): string {
  if (position === 1) {
    return '🥇'
  }
  if (position === 2) {
    return '🥈'
  }
  if (position === 3) {
    return '🥉'
  }
  return ''
}

export default function ResultPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { session } = useGameSession()
  const question = useGameStore((state) => state.currentQuestion)
  const { result, leaderboard, loading } = useQuestionResult(session?.id ?? null, session?.current_question_id ?? null)
  const [showCalculating, setShowCalculating] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null)
  const [mvpSummary, setMvpSummary] = useState<MvpSummary | null>(null)
  const [roundWinners, setRoundWinners] = useState<Record<string, Team | null>>({})

  const topFive = useMemo(
    () =>
      leaderboard
        .filter((entry) => entry.is_correct)
        .sort((a, b) => a.speed_rank - b.speed_rank)
        .slice(0, 5),
    [leaderboard],
  )

  const winnerVideo =
    result?.winner_team === 'viktor' ? question?.video_url_viktor ?? null : result?.winner_team === 'lucas' ? question?.video_url_lucas ?? null : null

  useEffect(() => {
    if (session?.status === 'question') {
      navigate('/question', { replace: true })
    }
  }, [navigate, session?.status])

  useEffect(() => {
    if (session?.status === 'question') {
      return
    }
    if (!session?.id) {
      const timeout = window.setTimeout(() => {
        setRoundWinners({})
        setSessionSummary(null)
        setMvpSummary(null)
      }, 0)
      return () => window.clearTimeout(timeout)
    }
  }, [session?.id, session?.status])

  useEffect(() => {
    const questionId = session?.current_question_id
    if (!questionId || !result) {
      return
    }
    if (session?.status !== 'result' && session?.status !== 'finished') {
      return
    }

    const timeout = window.setTimeout(() => {
      setRoundWinners((current) => ({ ...current, [questionId]: result.winner_team }))
      setMvpSummary(null)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [result, session?.current_question_id, session?.status])

  useEffect(() => {
    const winners = Object.values(roundWinners)
    if (winners.length === 0) {
      const timeout = window.setTimeout(() => {
        setSessionSummary(null)
      }, 0)
      return () => window.clearTimeout(timeout)
    }
    const viktorWins = winners.filter((winner) => winner === 'viktor').length
    const lucasWins = winners.filter((winner) => winner === 'lucas').length
    const winnerTeam = viktorWins === lucasWins ? null : viktorWins > lucasWins ? 'viktor' : 'lucas'
    const timeout = window.setTimeout(() => {
      setSessionSummary({ viktorWins, lucasWins, winnerTeam })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [roundWinners])

  useEffect(() => {
    const resetTimeout = window.setTimeout(() => {
      setShowScores(false)
      setShowVideo(false)
      setShowLeaderboard(false)
    }, 0)
    const t1 = window.setTimeout(() => setShowScores(true), 300)
    const t2 = window.setTimeout(() => setShowVideo(true), 600)
    const t3 = window.setTimeout(() => setShowLeaderboard(true), 900)
    return () => {
      window.clearTimeout(resetTimeout)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [result?.id, session?.status])

  useEffect(() => {
    const resetTimeout = window.setTimeout(() => setShowCalculating(false), 0)
    if (!loading) {
      window.clearTimeout(resetTimeout)
      return
    }
    const timeout = window.setTimeout(() => setShowCalculating(true), 5000)
    return () => {
      window.clearTimeout(resetTimeout)
      window.clearTimeout(timeout)
    }
  }, [loading, result?.id])

  if (session?.status === 'finished') {
    return (
      <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
          <p className="text-3xl font-black">🎉 FIM DO JOGO!</p>
          {sessionSummary && (
            <div className="mt-6 space-y-3 text-left">
              <p className="text-lg font-semibold">{`Equipe Viktor venceu ${sessionSummary.viktorWins} rodadas`}</p>
              <p className="text-lg font-semibold">{`Equipe Lucas venceu ${sessionSummary.lucasWins} rodadas`}</p>
              <p className="text-lg font-bold text-emerald-300">
                {sessionSummary.winnerTeam ? `${TEAM_LABELS[sessionSummary.winnerTeam]} venceu o jogo` : 'Empate geral'}
              </p>
            </div>
          )}
          {mvpSummary && (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-4 text-left">
              <p className="text-sm font-semibold text-slate-300">MVP (mais rápido geral)</p>
              <p className="mt-1 text-lg font-bold">{`${mvpSummary.name} (${TEAM_LABELS[mvpSummary.team]})`}</p>
              <p className="text-sm text-slate-300">{`Tempo médio: ${formatTime(mvpSummary.averageMs)}`}</p>
            </div>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 text-white">
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-center">
          <p className="text-2xl font-black">🏆 RESULTADO DA RODADA</p>
        </div>

        {loading && !showCalculating && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-2xl bg-slate-800" />
            <div className="h-44 animate-pulse rounded-2xl bg-slate-800" />
          </div>
        )}

        {loading && showCalculating && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center text-slate-200">Calculando resultado...</div>
        )}

        {result && (
          <>
            <div
              className={`grid gap-4 md:grid-cols-2 transition-all duration-500 ${showScores ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
            >
              <TeamScore
                team="viktor"
                correct={result.viktor_correct}
                total={result.viktor_total}
                pct={result.viktor_pct}
                isWinner={result.winner_team === null || result.winner_team === 'viktor'}
              />
              <TeamScore
                team="lucas"
                correct={result.lucas_correct}
                total={result.lucas_total}
                pct={result.lucas_pct}
                isWinner={result.winner_team === null || result.winner_team === 'lucas'}
              />
            </div>

            {result.winner_team === null && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center text-xl font-bold">EMPATE! 🤝</div>
            )}

            {result.winner_team !== null && (
              <div className={`transition-opacity duration-500 ${showVideo ? 'opacity-100' : 'opacity-0'}`}>
                <VideoPlayer url={winnerVideo} autoPlay />
              </div>
            )}

            <div
              className={`rounded-2xl border border-slate-700 bg-slate-900 p-4 transition-all duration-500 ${showLeaderboard ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`}
            >
              <p className="mb-3 text-lg font-bold">⚡ MAIS RÁPIDOS</p>
              <ul className="space-y-2 text-sm">
                {topFive.map((entry, index) => {
                  const position = index + 1
                  const medal = getRankEmoji(position)
                  return (
                    <li key={`${entry.session_id}-${entry.question_id}-${entry.name}-${entry.speed_rank}`} className={getRankStyle(position)}>
                      {`${position}. ${medal ? `${medal} ` : ''}${entry.name} (${TEAM_LABELS[entry.team]}) — ${formatTime(entry.response_time_ms)}`}
                    </li>
                  )
                })}
                {topFive.length === 0 && <li className="text-slate-300">Sem respostas corretas nesta rodada.</li>}
              </ul>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 text-center text-sm text-slate-300">
          {session?.status === 'result' ? 'Aguardando próxima...' : 'Aguardando atualização da sessão...'}
        </div>
      </section>
    </main>
  )
}
