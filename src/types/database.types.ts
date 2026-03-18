// Tipagem do schema público para uso com Supabase JS v2.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      answers: {
        Row: {
          id: string
          session_id: string
          question_id: string
          user_id: string
          team: 'viktor' | 'lucas'
          chosen_index: number
          is_correct: boolean
          response_time_ms: number
          answered_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          user_id: string
          team: 'viktor' | 'lucas'
          chosen_index: number
          is_correct: boolean
          response_time_ms: number
          answered_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_id?: string
          user_id?: string
          team?: 'viktor' | 'lucas'
          chosen_index?: number
          is_correct?: boolean
          response_time_ms?: number
          answered_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          status: 'waiting' | 'question' | 'revealing' | 'result' | 'finished'
          current_question_id: string | null
          current_question_index: number
          question_started_at: string | null
          created_by: string | null
          created_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          status?: 'waiting' | 'question' | 'revealing' | 'result' | 'finished'
          current_question_id?: string | null
          current_question_index?: number
          question_started_at?: string | null
          created_by?: string | null
          created_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          status?: 'waiting' | 'question' | 'revealing' | 'result' | 'finished'
          current_question_id?: string | null
          current_question_index?: number
          question_started_at?: string | null
          created_by?: string | null
          created_at?: string
          finished_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          team: 'viktor' | 'lucas' | null
          role: 'admin' | 'player'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          team?: 'viktor' | 'lucas' | null
          role?: 'admin' | 'player'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          team?: 'viktor' | 'lucas' | null
          role?: 'admin' | 'player'
          avatar_url?: string | null
          created_at?: string
        }
      }
      question_results: {
        Row: {
          id: string
          session_id: string
          question_id: string
          viktor_correct: number
          viktor_total: number
          viktor_pct: number
          lucas_correct: number
          lucas_total: number
          lucas_pct: number
          winner_team: 'viktor' | 'lucas' | null
          calculated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          viktor_correct: number
          viktor_total: number
          viktor_pct: number
          lucas_correct: number
          lucas_total: number
          lucas_pct: number
          winner_team?: 'viktor' | 'lucas' | null
          calculated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_id?: string
          viktor_correct?: number
          viktor_total?: number
          viktor_pct?: number
          lucas_correct?: number
          lucas_total?: number
          lucas_pct?: number
          winner_team?: 'viktor' | 'lucas' | null
          calculated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          text: string
          options: string[]
          correct_index: number
          order_index: number
          video_url_viktor: string | null
          video_url_lucas: string | null
        }
        Insert: {
          id?: string
          text: string
          options: string[]
          correct_index: number
          order_index: number
          video_url_viktor?: string | null
          video_url_lucas?: string | null
        }
        Update: {
          id?: string
          text?: string
          options?: string[]
          correct_index?: number
          order_index?: number
          video_url_viktor?: string | null
          video_url_lucas?: string | null
        }
      }
      session_players: {
        Row: {
          session_id: string
          user_id: string
          team: 'viktor' | 'lucas'
          joined_at: string
          is_online: boolean
        }
        Insert: {
          session_id: string
          user_id: string
          team: 'viktor' | 'lucas'
          joined_at?: string
          is_online?: boolean
        }
        Update: {
          session_id?: string
          user_id?: string
          team?: 'viktor' | 'lucas'
          joined_at?: string
          is_online?: boolean
        }
      }
    }
    Views: {
      leaderboard: {
        Row: {
          session_id: string
          question_id: string
          name: string
          team: 'viktor' | 'lucas'
          response_time_ms: number
          is_correct: boolean
          speed_rank: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
