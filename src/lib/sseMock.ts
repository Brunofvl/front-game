import type {
  GameSession,
  LeaderboardEntry,
  Question,
  QuestionResult,
  SessionPlayer,
} from '@/types/game.types'
import type { AnswerStats, GameState } from '@/lib/sseClient'

interface MockHandle {
  stop: () => void
}

export function startSSEMock(emit: (state: GameState) => void, onConnected: (connected: boolean) => void): MockHandle {
  let index = 0
  const statuses: GameSession['status'][] = ['waiting', 'question', 'revealing', 'result']
  onConnected(true)

  const emitState = () => {
    const status = statuses[index % statuses.length]
    const session: GameSession = {
      id: 'mock-session',
      status,
      current_question_id: status === 'waiting' ? null : 'mock-question-1',
      current_question_index: status === 'waiting' ? 0 : 1,
      question_started_at: new Date(Date.now() - 4000).toISOString(),
      created_by: null,
      created_at: new Date(Date.now() - 120000).toISOString(),
      finished_at: status === 'finished' ? new Date().toISOString() : null,
    }

    const question: Question | null =
      status === 'waiting'
        ? null
        : {
            id: 'mock-question-1',
            text: 'Qual é o diferencial do produto?',
            options: ['Preço', 'Qualidade', 'Atendimento', 'Entrega'],
            correct_index: 1,
            order_index: 1,
            video_url_viktor: null,
            video_url_lucas: null,
          }

    const answerStats: AnswerStats | null =
      status === 'waiting'
        ? null
        : {
            total_players: 9,
            answered_count: 6,
            answered_pct: 66.7,
            viktor_answered: 4,
            lucas_answered: 2,
            viktor_correct_pct: status === 'question' ? 0 : 75,
            lucas_correct_pct: status === 'question' ? 0 : 50,
          }

    const result: QuestionResult | null =
      status === 'result'
        ? {
            id: 'mock-result-1',
            session_id: 'mock-session',
            question_id: 'mock-question-1',
            viktor_correct: 3,
            viktor_total: 4,
            viktor_pct: 75,
            lucas_correct: 1,
            lucas_total: 2,
            lucas_pct: 50,
            winner_team: 'viktor',
            calculated_at: new Date().toISOString(),
          }
        : null

    const leaderboard: LeaderboardEntry[] = result
      ? [
          {
            session_id: 'mock-session',
            question_id: 'mock-question-1',
            name: 'Ana',
            team: 'viktor',
            response_time_ms: 820,
            is_correct: true,
            speed_rank: 1,
          },
        ]
      : []

    const players: SessionPlayer[] = [
      {
        session_id: 'mock-session',
        user_id: 'mock-user-1',
        team: 'viktor',
        joined_at: new Date(Date.now() - 300000).toISOString(),
        is_online: true,
      },
      {
        session_id: 'mock-session',
        user_id: 'mock-user-2',
        team: 'lucas',
        joined_at: new Date(Date.now() - 250000).toISOString(),
        is_online: true,
      },
    ]

    emit({
      session,
      current_question: question,
      answer_stats: answerStats,
      question_result: result,
      leaderboard,
      players,
      timestamp: new Date().toISOString(),
    })
    index += 1
  }

  emitState()
  const timer = window.setInterval(emitState, 5000)

  return {
    stop: () => {
      window.clearInterval(timer)
      onConnected(false)
    },
  }
}
