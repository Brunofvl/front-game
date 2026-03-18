// Tipos de domínio usados em toda a experiência do quiz em tempo real.
export type GameStatus = 'waiting' | 'question' | 'revealing' | 'result' | 'finished'
export type Team = 'viktor' | 'lucas'
export type PlayerRole = 'admin' | 'player'

export interface Profile {
  id: string
  name: string
  team: Team | null
  role: PlayerRole
  avatar_url: string | null
  created_at: string
}

export interface Question {
  id: string
  text: string
  options: string[]
  correct_index: number
  order_index: number
  video_url_viktor: string | null
  video_url_lucas: string | null
}

export interface GameSession {
  id: string
  status: GameStatus
  current_question_id: string | null
  current_question_index: number
  question_started_at: string | null
  created_by: string | null
  created_at: string
  finished_at: string | null
}

export interface Answer {
  id: string
  session_id: string
  question_id: string
  user_id: string
  team: Team
  chosen_index: number
  is_correct: boolean
  response_time_ms: number
  answered_at: string
}

export interface QuestionResult {
  id: string
  session_id: string
  question_id: string
  viktor_correct: number
  viktor_total: number
  viktor_pct: number
  lucas_correct: number
  lucas_total: number
  lucas_pct: number
  winner_team: Team | null
  calculated_at: string
}

export interface LeaderboardEntry {
  session_id: string
  question_id: string
  name: string
  team: Team
  response_time_ms: number
  is_correct: boolean
  speed_rank: number
}

export interface SessionPlayer {
  session_id: string
  user_id: string
  team: Team
  joined_at: string
  is_online: boolean
}
