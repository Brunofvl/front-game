import { config } from '@/lib/config'
import { startSSEMock } from '@/lib/sseMock'
import type {
  GameSession,
  LeaderboardEntry,
  Question,
  QuestionResult,
  SessionPlayer,
} from '@/types/game.types'

export interface AnswerStats {
  total_players: number
  answered_count: number
  answered_pct: number
  viktor_answered: number
  lucas_answered: number
  viktor_correct_pct: number
  lucas_correct_pct: number
}

export interface GameState {
  session: GameSession | null
  current_question: Question | null
  answer_stats: AnswerStats | null
  question_result: QuestionResult | null
  leaderboard: LeaderboardEntry[]
  players: SessionPlayer[]
  timestamp: string
}

type StateListener = (state: GameState) => void
type ConnectionListener = (connected: boolean) => void
type ErrorListener = (error: string | null) => void

class SSEClient {
  private es: EventSource | null = null
  private stateListeners: Set<StateListener> = new Set()
  private connectionListeners: Set<ConnectionListener> = new Set()
  private errorListeners: Set<ErrorListener> = new Set()
  private _connected = false
  private _lastState: GameState | null = null
  private _error: string | null = null
  private mockStop: (() => void) | null = null

  connect(baseUrl?: string): void {
    if (this.es || this.mockStop) {
      return
    }

    const useMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_SSE === 'true'
    if (useMock) {
      const mock = startSSEMock(
        (state) => {
          this._lastState = state
          this.emitState(state)
          this.setError(null)
        },
        (connected) => {
          this.setConnected(connected)
        },
      )
      this.mockStop = mock.stop
      return
    }

    const url = (baseUrl ?? config.sseUrl).replace(/\/+$/, '')
    const nextEventSource = new EventSource(`${url}/events`)
    this.es = nextEventSource

    nextEventSource.addEventListener('open', () => {
      this.setConnected(true)
      this.setError(null)
    })

    nextEventSource.addEventListener('error', () => {
      this.setConnected(false)
      this.setError('Reconectando...')
    })

    nextEventSource.addEventListener('state_update', (event) => {
      const message = event as MessageEvent<string>
      try {
        const state = JSON.parse(message.data) as GameState
        this._lastState = state
        this.emitState(state)
        this.setError(null)
      } catch {
        this.setError('Erro ao processar atualização SSE')
      }
    })
  }

  disconnect(): void {
    if (this.es) {
      this.es.close()
      this.es = null
    }
    if (this.mockStop) {
      this.mockStop()
      this.mockStop = null
    }
    this.setConnected(false)
  }

  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    if (this._lastState) {
      listener(this._lastState)
    }
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  subscribeConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener)
    listener(this._connected)
    return () => {
      this.connectionListeners.delete(listener)
    }
  }

  subscribeError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener)
    listener(this._error)
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  disconnectIfIdle(): void {
    if (this.stateListeners.size > 0 || this.connectionListeners.size > 0 || this.errorListeners.size > 0) {
      return
    }
    this.disconnect()
  }

  get connected(): boolean {
    return this._connected
  }

  get lastState(): GameState | null {
    return this._lastState
  }

  get error(): string | null {
    return this._error
  }

  private emitState(state: GameState): void {
    for (const listener of this.stateListeners) {
      listener(state)
    }
  }

  private setConnected(connected: boolean): void {
    if (this._connected === connected) {
      return
    }
    this._connected = connected
    for (const listener of this.connectionListeners) {
      listener(connected)
    }
  }

  private setError(error: string | null): void {
    if (this._error === error) {
      return
    }
    this._error = error
    for (const listener of this.errorListeners) {
      listener(error)
    }
  }
}

export const sseClient = new SSEClient()
