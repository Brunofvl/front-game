// Store central do estado da partida para sincronizar telas de jogador, admin e placar.
import { create } from 'zustand'
import type {
  Answer,
  GameSession,
  LeaderboardEntry,
  Profile,
  Question,
  QuestionResult,
  SessionPlayer,
} from '@/types/game.types'

interface GameState {
  session: GameSession | null
  currentQuestion: Question | null
  myAnswer: Answer | null
  questionResult: QuestionResult | null
  players: SessionPlayer[]
  leaderboard: LeaderboardEntry[]
  profile: Profile | null
  setSession: (session: GameSession | null) => void
  setCurrentQuestion: (question: Question | null) => void
  setMyAnswer: (answer: Answer | null) => void
  setQuestionResult: (result: QuestionResult | null) => void
  setPlayers: (players: SessionPlayer[]) => void
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void
  setProfile: (profile: Profile | null) => void
  reset: () => void
}

const initialState = {
  session: null,
  currentQuestion: null,
  myAnswer: null,
  questionResult: null,
  players: [] as SessionPlayer[],
  leaderboard: [] as LeaderboardEntry[],
  profile: null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setSession: (session) => set({ session }),
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  setMyAnswer: (myAnswer) => set({ myAnswer }),
  setQuestionResult: (questionResult) => set({ questionResult }),
  setPlayers: (players) => set({ players }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setProfile: (profile) => set({ profile }),
  reset: () => set(initialState),
}))
