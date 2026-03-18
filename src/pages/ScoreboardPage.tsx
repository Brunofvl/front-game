import confetti from 'canvas-confetti'
import { useEffect, useRef, useState } from 'react'
import { TeamScore } from '@/components/game/TeamScore'
import { VideoPlayer } from '@/components/game/VideoPlayer'
import { useGameSession } from '@/hooks/useGameSession'
import { useLiveStats } from '@/hooks/useLiveStats'
import { useQuestionResult } from '@/hooks/useQuestionResult'
import { useSessionPlayers } from '@/hooks/useSessionPlayers'
import { QUESTION_DURATION_MS, TEAM_LABELS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/store/gameStore'
import type { GameStatus, Team } from '@/types/game.types'

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

function getStatusLabel(status: GameStatus): string {
  if (status === 'waiting') {
    return 'Aguardando o admin iniciar...'
  }
  if (status === 'question') {
    return 'Pergunta ativa'
  }
  if (status === 'revealing') {
    return 'Revelando respostas'
  }
  if (status === 'result') {
    return 'Resultado da rodada'
  }
  return 'Fim do jogo'
}

export default function ScoreboardPage(): React.JSX.Element {
  const [nowMs, setNowMs] = useState(0)
  const [nameById, setNameById] = useState<Record<string, string>>({})
  const [displayStatus, setDisplayStatus] = useState<GameStatus>('waiting')
  const [showStatus, setShowStatus] = useState(true)
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({ viktorWins: 0, lucasWins: 0, winnerTeam: null })
  const [mvpSummary, setMvpSummary] = useState<MvpSummary | null>(null)

  const confettiSessionRef = useRef<string | null>(null)
  const { session, loading } = useGameSession({ navigateByStatus: false, includeFinished: true })
  const currentQuestion = useGameStore((state) => state.currentQuestion)
  const players = useGameStore((state) => state.players)
  const { result, leaderboard } = useQuestionResult(session?.id ?? null, session?.current_question_id ?? null)
  const liveStats = useLiveStats(session?.id ?? null, session?.current_question_id ?? null, session?.status ?? 'waiting')
  const [roundWinners, setRoundWinners] = useState<Record<string, Team | null>>({})

  useSessionPlayers(session?.id ?? null)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 250)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!session?.status) {
      return
    }
    const t1 = window.setTimeout(() => setShowStatus(false), 0)
    const t2 = window.setTimeout(() => {
      setDisplayStatus(session.status)
      setShowStatus(true)
    }, 220)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [session?.status])

  useEffect(() => {
    const uniqueIds = Array.from(new Set(players.map((item) => item.user_id)))
    if (uniqueIds.length === 0) {
      const timeout = window.setTimeout(() => setNameById({}), 0)
      return () => window.clearTimeout(timeout)
    }

    const loadNames = async () => {
      const { data } = await supabase.from('profiles').select('id,name').in('id', uniqueIds)
      const nextMap: Record<string, string> = {}
      for (const row of data ?? []) {
        const entry = row as { id: string; name: string }
        nextMap[entry.id] = entry.name
      }
      setNameById(nextMap)
    }

    void loadNames()
  }, [players])

  useEffect(() => {
    if (!session?.id) {
      const timeout = window.setTimeout(() => {
        setRoundWinners({})
        setSessionSummary({ viktorWins: 0, lucasWins: 0, winnerTeam: null })
        setMvpSummary(null)
      }, 0)
      return () => window.clearTimeout(timeout)
    }
  }, [session?.id])

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
    const viktorWins = winners.filter((winner) => winner === 'viktor').length
    const lucasWins = winners.filter((winner) => winner === 'lucas').length
    const winnerTeam = viktorWins === lucasWins ? null : viktorWins > lucasWins ? 'viktor' : 'lucas'
    const timeout = window.setTimeout(() => {
      setSessionSummary({ viktorWins, lucasWins, winnerTeam })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [roundWinners])

  useEffect(() => {
    if (!session?.id || session.status !== 'finished') {
      return
    }
    const timeout = window.setTimeout(() => {
      setMvpSummary(null)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [session?.id, session?.status])

  useEffect(() => {
    if (!session?.id || displayStatus !== 'finished') {
      return
    }
    if (confettiSessionRef.current === session.id) {
      return
    }
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.4 } })
    confettiSessionRef.current = session.id
  }, [displayStatus, session?.id])

  const remainingSeconds = (() => {
    if (!session?.question_started_at) {
      return 0
    }
    const elapsed = nowMs - new Date(session.question_started_at).getTime()
    const remainingMs = Math.max(0, QUESTION_DURATION_MS - elapsed)
    return Math.ceil(remainingMs / 1000)
  })()

  const viktorPlayers = players.filter((item) => item.team === 'viktor')
  const lucasPlayers = players.filter((item) => item.team === 'lucas')
  const topThree = leaderboard.filter((item) => item.is_correct).slice(0, 3)
  const questionCount = Math.max(10, (session?.current_question_index ?? 0) + 1)

  const winnerVideo = !result?.winner_team
    ? null
    : result.winner_team === 'viktor'
      ? currentQuestion?.video_url_viktor ?? null
      : currentQuestion?.video_url_lucas ?? null

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-slate-100">
        <p className="text-3xl font-semibold">Carregando placar...</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-slate-100">
        <div className="text-center">
          <p className="text-4xl font-black">🎮 QUIZ CORPORATIVO 2025</p>
          <p className="mt-4 text-xl text-slate-300">Nenhuma sessão ativa no momento</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-white">
      <section className={`mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col justify-between transition-opacity duration-300 ${showStatus ? 'opacity-100' : 'opacity-0'}`}>
        <header className="mb-6 flex items-center justify-between">
          <p className="text-2xl font-black tracking-wide">QUIZ CORPORATIVO 2025</p>
          <p className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1 text-sm text-slate-300">{getStatusLabel(displayStatus)}</p>
        </header>

        {displayStatus === 'waiting' && (
          <div className="flex flex-1 flex-col justify-center space-y-8">
            <div className="text-center">
              <p className="text-6xl font-black">🎮 QUIZ CORPORATIVO 2025</p>
              <p className="mt-4 text-4xl font-semibold">Viktor ⚔️ vs ⚔️ Lucas</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-purple-500/50 bg-purple-500/10 p-6">
                <p className="text-3xl font-black text-purple-200">{TEAM_LABELS.viktor}</p>
                <p className="mt-3 text-lg text-slate-200">{viktorPlayers.map((item) => nameById[item.user_id] ?? 'Jogador').join(', ') || 'Sem jogadores online'}</p>
                <p className="mt-3 text-xl font-semibold text-purple-200">{`${viktorPlayers.length} jogadores`}</p>
              </div>
              <div className="rounded-2xl border border-orange-500/50 bg-orange-500/10 p-6">
                <p className="text-3xl font-black text-orange-200">{TEAM_LABELS.lucas}</p>
                <p className="mt-3 text-lg text-slate-200">{lucasPlayers.map((item) => nameById[item.user_id] ?? 'Jogador').join(', ') || 'Sem jogadores online'}</p>
                <p className="mt-3 text-xl font-semibold text-orange-200">{`${lucasPlayers.length} jogadores`}</p>
              </div>
            </div>
            <p className="text-center text-3xl font-semibold text-slate-200">Aguardando o admin iniciar...</p>
            <p className="text-center text-5xl tracking-[0.8rem] text-slate-400">● ● ●</p>
          </div>
        )}

        {displayStatus === 'question' && (
          <div className="flex flex-1 flex-col justify-center space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-3xl font-black">{`Pergunta ${(session.current_question_index ?? 0) + 1} de ${Math.max(questionCount, 1)}`}</p>
              <div className="flex items-center gap-4">
                <div className="h-4 w-56 rounded-full bg-slate-800">
                  <div className="h-4 rounded-full bg-yellow-400 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, (remainingSeconds / (QUESTION_DURATION_MS / 1000)) * 100))}%` }} />
                </div>
                <p className="text-3xl font-black text-yellow-300">{`${remainingSeconds}s`}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">
              <p className="text-4xl font-semibold leading-tight">{currentQuestion?.text ?? 'Pergunta em carregamento...'}</p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {(currentQuestion?.options ?? []).map((option, index) => (
                  <div key={`${option}-${index}`} className="rounded-xl border border-slate-700 bg-slate-800 p-4 text-2xl font-semibold">
                    {`[${String.fromCharCode(65 + index)}] ${option}`}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-2xl font-semibold">{`Viktor ${liveStats.viktorAnswered}/${viktorPlayers.length} responderam`}</p>
              <div className="mt-2 h-4 w-full rounded-full bg-slate-800">
                <div
                  className="h-4 rounded-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${viktorPlayers.length > 0 ? Math.min(100, (liveStats.viktorAnswered / viktorPlayers.length) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-4 text-2xl font-semibold">{`Lucas ${liveStats.lucasAnswered}/${lucasPlayers.length} responderam`}</p>
              <div className="mt-2 h-4 w-full rounded-full bg-slate-800">
                <div
                  className="h-4 rounded-full bg-orange-500 transition-all duration-300"
                  style={{ width: `${lucasPlayers.length > 0 ? Math.min(100, (liveStats.lucasAnswered / lucasPlayers.length) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {(displayStatus === 'revealing' || displayStatus === 'result') && (
          <div className="flex flex-1 flex-col justify-center space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <TeamScore
                team="viktor"
                correct={result?.viktor_correct ?? 0}
                total={result?.viktor_total ?? 0}
                pct={result?.viktor_pct ?? liveStats.viktorCorrectPct}
                isWinner={result?.winner_team === null || result?.winner_team === 'viktor'}
              />
              <TeamScore
                team="lucas"
                correct={result?.lucas_correct ?? 0}
                total={result?.lucas_total ?? 0}
                pct={result?.lucas_pct ?? liveStats.lucasCorrectPct}
                isWinner={result?.winner_team === null || result?.winner_team === 'lucas'}
              />
            </div>

            {displayStatus === 'result' && (
              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                <VideoPlayer url={winnerVideo} autoPlay />
              </div>
            )}

            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <p className="text-2xl font-black">⚡ TOP 3 MAIS RÁPIDOS</p>
              <p className="mt-3 text-lg text-slate-200">
                {topThree.length > 0
                  ? topThree
                      .map((entry) => `${entry.name} ${formatTime(entry.response_time_ms)}`)
                      .join(' · ')
                  : 'Sem respostas corretas nesta rodada'}
              </p>
              <p className="mt-4 text-xl font-semibold text-slate-300">{`Placar: Viktor ${sessionSummary.viktorWins} ✓  |  Lucas ${sessionSummary.lucasWins} ✓  |  Empates ${Math.max(0, (session.current_question_index ?? 0) + (displayStatus === 'result' ? 1 : 0) - sessionSummary.viktorWins - sessionSummary.lucasWins)}`}</p>
            </div>
          </div>
        )}

        {displayStatus === 'finished' && (
          <div className="flex flex-1 flex-col justify-center space-y-8 text-center">
            <p className="text-6xl font-black">🎉 FIM DO JOGO! 🎉</p>
            <p className="text-4xl font-bold text-emerald-300">
              {sessionSummary.winnerTeam ? `CAMPEÃO: ${TEAM_LABELS[sessionSummary.winnerTeam]}! 🏆` : 'EMPATE GERAL! 🤝'}
            </p>
            <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left">
              <p className="text-2xl font-semibold">{`Viktor: ${sessionSummary.viktorWins} vitórias`}</p>
              <div className="mt-2 h-4 w-full rounded-full bg-slate-800">
                <div
                  className="h-4 rounded-full bg-purple-500"
                  style={{
                    width: `${sessionSummary.viktorWins + sessionSummary.lucasWins > 0 ? (sessionSummary.viktorWins / (sessionSummary.viktorWins + sessionSummary.lucasWins)) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="mt-5 text-2xl font-semibold">{`Lucas: ${sessionSummary.lucasWins} vitórias`}</p>
              <div className="mt-2 h-4 w-full rounded-full bg-slate-800">
                <div
                  className="h-4 rounded-full bg-orange-500"
                  style={{
                    width: `${sessionSummary.viktorWins + sessionSummary.lucasWins > 0 ? (sessionSummary.lucasWins / (sessionSummary.viktorWins + sessionSummary.lucasWins)) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            {mvpSummary && <p className="text-2xl font-semibold">{`MVP: ${mvpSummary.name} (${TEAM_LABELS[mvpSummary.team]}) — média ${formatTime(mvpSummary.averageMs)}`}</p>}
          </div>
        )}
      </section>
    </main>
  )
}
