import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LiveProgressBar } from '@/components/game/LiveProgressBar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdminControls } from '@/hooks/useAdminControls'
import { useAuth } from '@/hooks/useAuth'
import { useGameSession } from '@/hooks/useGameSession'
import { useLiveStats } from '@/hooks/useLiveStats'
import { useQuestionResult } from '@/hooks/useQuestionResult'
import { useSessionPlayers } from '@/hooks/useSessionPlayers'
import { QUESTION_DURATION_MS, TEAM_LABELS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { useGameStore } from '@/store/gameStore'
import type { GameSession, Question, QuestionResult } from '@/types/game.types'

interface SessionOption {
  id: string
  status: GameSession['status']
  created_at: string
}

interface QuestionFormState {
  text: string
  options: [string, string, string, string]
  correctIndex: number
  videoUrlViktor: string
  videoUrlLucas: string
}

function formatPct(value: number): string {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
}

function getStatusChip(status: GameSession['status']): string {
  if (status === 'waiting') {
    return 'AGUARDANDO'
  }
  if (status === 'question') {
    return 'PERGUNTA ATIVA'
  }
  if (status === 'revealing') {
    return 'REVELANDO'
  }
  if (status === 'result') {
    return 'RESULTADO'
  }
  return 'FINALIZADO'
}

function truncateText(text: string): string {
  if (text.length <= 60) {
    return text
  }
  return `${text.slice(0, 60)}...`
}

function createEmptyQuestionForm(): QuestionFormState {
  return {
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    videoUrlViktor: '',
    videoUrlLucas: '',
  }
}

function mapQuestionToForm(question: Question): QuestionFormState {
  return {
    text: question.text,
    options: [
      question.options[0] ?? '',
      question.options[1] ?? '',
      question.options[2] ?? '',
      question.options[3] ?? '',
    ],
    correctIndex: Math.max(0, Math.min(3, question.correct_index)),
    videoUrlViktor: question.video_url_viktor ?? '',
    videoUrlLucas: question.video_url_lucas ?? '',
  }
}

export default function AdminPage(): React.JSX.Element {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionOptions, setSessionOptions] = useState<SessionOption[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [showQuestionsPanel, setShowQuestionsPanel] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [questionForm, setQuestionForm] = useState<QuestionFormState>(() => createEmptyQuestionForm())
  const [questionFormError, setQuestionFormError] = useState<string | null>(null)
  const [questionFormLoading, setQuestionFormLoading] = useState(false)
  const [questionDeleteLoadingId, setQuestionDeleteLoadingId] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(0)
  const lastActionAtRef = useRef(0)
  const autoClosedRef = useRef(false)
  const { session, loading: sessionLoading, error: sessionError } = useGameSession({
    sessionId: selectedSessionId,
    navigateByStatus: false,
    includeFinished: true,
  })
  const currentQuestion = useGameStore((state) => state.currentQuestion)
  const players = useGameStore((state) => state.players)
  const { logout, loading: authLoading } = useAuth()
  const controls = useAdminControls()
  const { result } = useQuestionResult(session?.id ?? null, session?.current_question_id ?? null)
  const liveStats = useLiveStats(session?.id ?? null, session?.current_question_id ?? null, session?.status ?? 'waiting')

  useSessionPlayers(session?.id ?? null)

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase.from('game_sessions').select('id,status,created_at').order('created_at', { ascending: false }).limit(20)
      const nextOptions = ((data ?? []) as SessionOption[]).map((item) => ({
        id: item.id,
        status: item.status,
        created_at: item.created_at,
      }))
      setSessionOptions(nextOptions)
      if (!selectedSessionId && nextOptions.length > 0) {
        setSelectedSessionId(nextOptions[0].id)
      }
    }
    void fetchSessions()
  }, [selectedSessionId])

  useEffect(() => {
    const channel = supabase
      .channel('admin-session-options')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, async () => {
        const { data } = await supabase.from('game_sessions').select('id,status,created_at').order('created_at', { ascending: false }).limit(20)
        const nextOptions = (data ?? []) as SessionOption[]
        setSessionOptions(nextOptions)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchQuestions = useCallback(async (): Promise<void> => {
    const { data } = await supabase.from('questions').select('*').order('order_index', { ascending: true })
    setQuestions((data as Question[] | null) ?? [])
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchQuestions()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchQuestions])

  useEffect(() => {
    if (!session?.id) {
      const timeout = window.setTimeout(() => {
        setQuestionResults([])
      }, 0)
      return () => window.clearTimeout(timeout)
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id || !session?.current_question_id || !result) {
      return
    }
    if (session.status !== 'result' && session.status !== 'finished') {
      return
    }

    const timeout = window.setTimeout(() => {
      setQuestionResults((current) => {
        const filtered = current.filter((item) => item.question_id !== session.current_question_id)
        return [...filtered, result].sort((a, b) => a.question_id.localeCompare(b.question_id))
      })
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [result, session?.current_question_id, session?.id, session?.status])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 250)
    return () => window.clearInterval(interval)
  }, [])

  const remainingSeconds = (() => {
    if (!session?.question_started_at) {
      return 0
    }
    const elapsed = nowMs - new Date(session.question_started_at).getTime()
    const remainingMs = Math.max(0, QUESTION_DURATION_MS - elapsed)
    return Math.ceil(remainingMs / 1000)
  })()

  useEffect(() => {
    if (session?.status !== 'question' || !session?.current_question_id) {
      autoClosedRef.current = false
      return
    }
    if (remainingSeconds > 0 || autoClosedRef.current || controls.loading) {
      return
    }
    autoClosedRef.current = true
    void controls.closeQuestion(session.id)
  }, [controls, remainingSeconds, session?.current_question_id, session?.id, session?.status])

  const viktorOnline = useMemo(
    () => players.filter((player) => player.is_online && player.team === 'viktor').length,
    [players],
  )
  const lucasOnline = useMemo(() => players.filter((player) => player.is_online && player.team === 'lucas').length, [players])
  const wins = useMemo(
    () => ({
      viktor: questionResults.filter((item) => item.winner_team === 'viktor').length,
      lucas: questionResults.filter((item) => item.winner_team === 'lucas').length,
      draws: questionResults.filter((item) => item.winner_team === null).length,
    }),
    [questionResults],
  )

  const resultByQuestion = useMemo(() => {
    const map = new Map<string, QuestionResult>()
    for (const item of questionResults) {
      map.set(item.question_id, item)
    }
    return map
  }, [questionResults])

  const runDebounced = async (action: () => Promise<void>): Promise<void> => {
    const now = Date.now()
    if (now - lastActionAtRef.current < 500 || controls.loading) {
      return
    }
    lastActionAtRef.current = now
    await action()
  }

  const handleCreateSession = async (): Promise<void> => {
    await runDebounced(async () => {
      const created = await controls.createSession()
      setSelectedSessionId(created.id)
    })
  }

  const handleStartGame = async (): Promise<void> => {
    if (!session?.id) {
      return
    }
    const confirmed = window.confirm('Tem certeza? Todos os jogadores serão notificados.')
    if (!confirmed) {
      return
    }
    await runDebounced(async () => {
      await controls.startGame(session.id)
    })
  }

  const handleCloseQuestion = async (): Promise<void> => {
    if (!session?.id) {
      return
    }
    await runDebounced(async () => {
      await controls.closeQuestion(session.id)
    })
  }

  const handleNextQuestion = async (): Promise<void> => {
    if (!session?.id) {
      return
    }
    await runDebounced(async () => {
      await controls.nextQuestion(session.id)
    })
  }

  const handleEndGame = async (): Promise<void> => {
    if (!session?.id) {
      return
    }
    const confirmed = window.confirm('Encerrar agora? Não será possível continuar.')
    if (!confirmed) {
      return
    }
    await runDebounced(async () => {
      await controls.endGame(session.id)
    })
  }

  const handleQuestionTextChange = (value: string): void => {
    setQuestionForm((current) => ({ ...current, text: value }))
  }

  const handleOptionChange = (index: 0 | 1 | 2 | 3, value: string): void => {
    setQuestionForm((current) => {
      const nextOptions: [string, string, string, string] = [...current.options] as [string, string, string, string]
      nextOptions[index] = value
      return { ...current, options: nextOptions }
    })
  }

  const handleStartCreateQuestion = (): void => {
    setEditingQuestionId(null)
    setQuestionForm(createEmptyQuestionForm())
    setQuestionFormError(null)
  }

  const handleStartEditQuestion = (question: Question): void => {
    setEditingQuestionId(question.id)
    setQuestionForm(mapQuestionToForm(question))
    setQuestionFormError(null)
  }

  const handleCancelEditQuestion = (): void => {
    setEditingQuestionId(null)
    setQuestionForm(createEmptyQuestionForm())
    setQuestionFormError(null)
  }

  const handleSubmitQuestion = async (): Promise<void> => {
    if (questionFormLoading) {
      return
    }
    const text = questionForm.text.trim()
    const options = questionForm.options.map((item) => item.trim()) as [string, string, string, string]
    if (!text) {
      setQuestionFormError('Digite o enunciado da pergunta.')
      return
    }
    if (options.some((item) => !item)) {
      setQuestionFormError('Preencha as quatro alternativas.')
      return
    }
    setQuestionFormLoading(true)
    setQuestionFormError(null)
    const payload = {
      text,
      options,
      correct_index: questionForm.correctIndex,
      video_url_viktor: questionForm.videoUrlViktor.trim() || null,
      video_url_lucas: questionForm.videoUrlLucas.trim() || null,
    }
    if (editingQuestionId) {
      const { error } = await supabase.from('questions').update(payload).eq('id', editingQuestionId)
      if (error) {
        setQuestionFormError(error.message)
        setQuestionFormLoading(false)
        return
      }
    } else {
      const nextOrderIndex = questions.reduce((max, item) => Math.max(max, item.order_index), -1) + 1
      const { error } = await supabase.from('questions').insert({ ...payload, order_index: nextOrderIndex })
      if (error) {
        setQuestionFormError(error.message)
        setQuestionFormLoading(false)
        return
      }
    }
    await fetchQuestions()
    setEditingQuestionId(null)
    setQuestionForm(createEmptyQuestionForm())
    setQuestionFormLoading(false)
  }

  const handleDeleteQuestion = async (question: Question): Promise<void> => {
    if (questionDeleteLoadingId) {
      return
    }
    const confirmed = window.confirm('Excluir esta pergunta? Essa ação não pode ser desfeita.')
    if (!confirmed) {
      return
    }
    setQuestionDeleteLoadingId(question.id)
    setQuestionFormError(null)
    const { error } = await supabase.from('questions').delete().eq('id', question.id)
    if (error) {
      setQuestionFormError(error.message)
      setQuestionDeleteLoadingId(null)
      return
    }
    const { data: orderedData } = await supabase.from('questions').select('id,order_index').order('order_index', { ascending: true })
    const ordered = (orderedData ?? []) as Array<{ id: string; order_index: number }>
    const updates = ordered
      .map((item, index) => ({ id: item.id, expectedOrder: index, currentOrder: item.order_index }))
      .filter((item) => item.currentOrder !== item.expectedOrder)
    if (updates.length > 0) {
      await Promise.all(
        updates.map((item) =>
          supabase
            .from('questions')
            .update({ order_index: item.expectedOrder })
            .eq('id', item.id),
        ),
      )
    }
    await fetchQuestions()
    if (editingQuestionId === question.id) {
      setEditingQuestionId(null)
      setQuestionForm(createEmptyQuestionForm())
    }
    setQuestionDeleteLoadingId(null)
  }

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-8 text-white">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <Card className="border-slate-700 bg-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-black">🎮 PAINEL ADMIN — Viktor vs Lucas</CardTitle>
            <Button variant="outline" className="bg-slate-100 text-slate-900 hover:bg-white" onClick={() => void logout()} disabled={authLoading}>
              {authLoading ? 'Saindo...' : 'Sair'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-300">Sessão selecionada</p>
                <select
                  className="mt-2 w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                  value={selectedSessionId ?? ''}
                  onChange={(event) => setSelectedSessionId(event.target.value || null)}
                >
                  {sessionOptions.length === 0 && <option value="">Nenhuma sessão disponível</option>}
                  {sessionOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {`#${option.id.slice(0, 8)} — ${option.status}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-300">Status</p>
                <p className="mt-2 text-lg font-bold text-emerald-300">{session ? getStatusChip(session.status) : 'SEM SESSÃO'}</p>
                <p className="text-xs text-slate-300">{session ? `Sessão #${session.id.slice(0, 8)}` : 'Crie ou selecione uma sessão'}</p>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-300">Ações rápidas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button onClick={() => void handleCreateSession()} disabled={controls.loading}>
                    Nova Sessão
                  </Button>
                  <Button variant="outline" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => window.open('/scoreboard', '_blank')}>
                    Abrir Placar
                  </Button>
                </div>
              </div>
            </div>
            {sessionLoading && <p className="text-sm text-slate-300">Carregando sessão...</p>}
            {sessionError && <p className="text-sm text-red-300">{sessionError}</p>}
            {controls.error && <p className="text-sm text-red-300">{controls.error}</p>}
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="border-slate-700 bg-slate-900 text-white lg:col-span-2">
            <CardHeader>
              <CardTitle>Painel da Rodada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {session?.status === 'waiting' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-300">Tudo pronto para iniciar. Os jogadores serão notificados ao começar.</p>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-purple-500/50 bg-purple-500/10 p-4">
                      <p className="font-semibold text-purple-200">{TEAM_LABELS.viktor}</p>
                      <p className="mt-2 text-3xl font-black">{viktorOnline}</p>
                      <p className="text-sm text-slate-300">jogadores online</p>
                    </div>
                    <div className="rounded-xl border border-orange-500/50 bg-orange-500/10 p-4">
                      <p className="font-semibold text-orange-200">{TEAM_LABELS.lucas}</p>
                      <p className="mt-2 text-3xl font-black">{lucasOnline}</p>
                      <p className="text-sm text-slate-300">jogadores online</p>
                    </div>
                  </div>
                  <Button onClick={() => void handleStartGame()} disabled={!session?.id || controls.loading}>
                    {controls.loading ? 'Iniciando...' : '▶ INICIAR JOGO'}
                  </Button>
                </div>
              )}

              {session?.status === 'question' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="font-semibold">PERGUNTA ATIVA</p>
                    <p className="text-3xl font-black text-yellow-300">{`⏱ ${remainingSeconds}s`}</p>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="text-sm text-slate-300">{`Pergunta ${(session.current_question_index ?? 0) + 1} de ${Math.max(questions.length, 1)}`}</p>
                    <p className="mt-2 text-lg font-semibold">{currentQuestion?.text ?? 'Carregando pergunta...'}</p>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p className="font-semibold">{`Respostas recebidas: ${liveStats.answeredCount} de ${liveStats.totalPlayers} (${Math.round(liveStats.answeredPct)}%)`}</p>
                    <LiveProgressBar viktor={liveStats.viktorAnswered} lucas={liveStats.lucasAnswered} showLabels={false} />
                    <p className="text-sm text-slate-300">{`Viktor: ${liveStats.viktorAnswered}/${viktorOnline}  Lucas: ${liveStats.lucasAnswered}/${lucasOnline}`}</p>
                  </div>
                  <Button variant="destructive" onClick={() => void handleCloseQuestion()} disabled={controls.loading}>
                    {controls.loading ? 'Fechando...' : '⏹ FECHAR PERGUNTA AGORA'}
                  </Button>
                </div>
              )}

              {session?.status === 'revealing' && (
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <p className="text-xl font-black text-yellow-300">Revelando resposta...</p>
                  <p className="text-sm text-slate-300">{`Acerto parcial — Viktor ${formatPct(liveStats.viktorCorrectPct)} | Lucas ${formatPct(liveStats.lucasCorrectPct)}`}</p>
                  <LiveProgressBar viktor={liveStats.viktorCorrectPct} lucas={liveStats.lucasCorrectPct} />
                </div>
              )}

              {session?.status === 'result' && (
                <div className="space-y-4">
                  <p className="text-xl font-black text-emerald-300">STATUS: RESULTADO</p>
                  <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <p>{`Viktor: ${formatPct(result?.viktor_pct ?? 0)}`}</p>
                    <p>{`Lucas: ${formatPct(result?.lucas_pct ?? 0)}`}</p>
                    <LiveProgressBar viktor={result?.viktor_pct ?? 0} lucas={result?.lucas_pct ?? 0} />
                  </div>
                  <p className="text-lg font-semibold">
                    {result?.winner_team ? `🏆 VENCEDOR DA RODADA: ${TEAM_LABELS[result.winner_team]}` : '🤝 RODADA EMPATADA'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleNextQuestion()} disabled={controls.loading}>
                      {controls.loading ? 'Avançando...' : '▶ PRÓXIMA PERGUNTA'}
                    </Button>
                    <Button variant="destructive" onClick={() => void handleEndGame()} disabled={controls.loading}>
                      {controls.loading ? 'Encerrando...' : '⏹ ENCERRAR JOGO'}
                    </Button>
                  </div>
                </div>
              )}

              {session?.status === 'finished' && (
                <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
                  <p className="text-2xl font-black text-emerald-300">JOGO ENCERRADO</p>
                  <p className="text-sm text-slate-300">Crie uma nova sessão para iniciar outro jogo.</p>
                  <Button onClick={() => void handleCreateSession()} disabled={controls.loading}>
                    {controls.loading ? 'Criando...' : 'Criar Nova Sessão'}
                  </Button>
                </div>
              )}

              {!session && (
                <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 text-sm text-slate-300">
                  Nenhuma sessão ativa selecionada.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-900 text-white">
            <CardHeader>
              <CardTitle>Placar Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{`Viktor: ${wins.viktor} vitórias`}</p>
              <p className="text-sm">{`Lucas: ${wins.lucas} vitórias`}</p>
              <p className="text-sm">{`Empates: ${wins.draws}`}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-700 bg-slate-900 text-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gerenciamento de Perguntas</CardTitle>
            <Button variant="ghost" className="text-slate-100 hover:bg-slate-800" onClick={() => setShowQuestionsPanel((current) => !current)}>
              {showQuestionsPanel ? 'Ocultar' : 'Mostrar'}
            </Button>
          </CardHeader>
          {showQuestionsPanel && (
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{editingQuestionId ? 'Editar pergunta' : 'Nova pergunta'}</p>
                  <div className="flex gap-2">
                    {editingQuestionId && (
                      <Button variant="outline" className="bg-slate-200 text-slate-900 hover:bg-white" onClick={handleCancelEditQuestion}>
                        Cancelar edição
                      </Button>
                    )}
                    {!editingQuestionId && (
                      <Button variant="outline" className="bg-slate-200 text-slate-900 hover:bg-white" onClick={handleStartCreateQuestion}>
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <textarea
                    value={questionForm.text}
                    onChange={(event) => handleQuestionTextChange(event.target.value)}
                    className="min-h-20 w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                    placeholder="Enunciado da pergunta"
                  />
                  {(['A', 'B', 'C', 'D'] as const).map((label, index) => (
                    <div key={label} className="grid gap-2 md:grid-cols-[40px,1fr]">
                      <p className="flex items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-sm font-semibold">{label}</p>
                      <input
                        value={questionForm.options[index]}
                        onChange={(event) => handleOptionChange(index as 0 | 1 | 2 | 3, event.target.value)}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                        placeholder={`Alternativa ${label}`}
                      />
                    </div>
                  ))}
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-300">Resposta correta</p>
                      <select
                        value={String(questionForm.correctIndex)}
                        onChange={(event) =>
                          setQuestionForm((current) => ({ ...current, correctIndex: Number(event.target.value) as 0 | 1 | 2 | 3 }))
                        }
                        className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                      >
                        <option value="0">Alternativa A</option>
                        <option value="1">Alternativa B</option>
                        <option value="2">Alternativa C</option>
                        <option value="3">Alternativa D</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-300">Vídeo Viktor (opcional)</p>
                      <input
                        value={questionForm.videoUrlViktor}
                        onChange={(event) => setQuestionForm((current) => ({ ...current, videoUrlViktor: event.target.value }))}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wider text-slate-300">Vídeo Lucas (opcional)</p>
                      <input
                        value={questionForm.videoUrlLucas}
                        onChange={(event) => setQuestionForm((current) => ({ ...current, videoUrlLucas: event.target.value }))}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 p-2 text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  {questionFormError && <p className="text-sm text-red-300">{questionFormError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void handleSubmitQuestion()} disabled={questionFormLoading}>
                      {questionFormLoading ? 'Salvando...' : editingQuestionId ? 'Salvar alterações' : 'Criar pergunta'}
                    </Button>
                  </div>
                </div>
              </div>
              {questions.map((question, index) => {
                const questionResult = resultByQuestion.get(question.id)
                const isActive =
                  session?.current_question_id === question.id && (session?.status === 'question' || session?.status === 'revealing')
                const statusLabel = questionResult ? 'concluída' : isActive ? 'ativa' : 'pendente'
                const correctLabel = ['A', 'B', 'C', 'D'][question.correct_index] ?? 'A'
                return (
                  <div key={question.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{`${index + 1}. ${truncateText(question.text)}`}</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="bg-slate-200 text-slate-900 hover:bg-white"
                          onClick={() => handleStartEditQuestion(question)}
                          disabled={questionDeleteLoadingId === question.id}
                        >
                          Editar
                        </Button>
                        <Button variant="destructive" onClick={() => void handleDeleteQuestion(question)} disabled={questionDeleteLoadingId === question.id}>
                          {questionDeleteLoadingId === question.id ? 'Excluindo...' : 'Excluir'}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs uppercase text-slate-300">{`Status: ${statusLabel}`}</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-200">
                      {question.options.slice(0, 4).map((option, optionIndex) => (
                        <p key={`${question.id}-${optionIndex}`} className={optionIndex === question.correct_index ? 'font-semibold text-emerald-300' : ''}>
                          {`${['A', 'B', 'C', 'D'][optionIndex]}. ${option}`}
                        </p>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-300">{`Resposta correta: ${correctLabel}`}</p>
                    {questionResult && (
                      <p className="mt-1 text-xs text-slate-200">{`Resultado: Viktor ${formatPct(questionResult.viktor_pct)} vs Lucas ${formatPct(questionResult.lucas_pct)}`}</p>
                    )}
                  </div>
                )
              })}
              {questions.length === 0 && <p className="text-sm text-slate-300">Nenhuma pergunta cadastrada.</p>}
            </CardContent>
          )}
        </Card>
      </section>
    </main>
  )
}
