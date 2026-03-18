import { createClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'

export type RealtimeConnectionState = 'connected' | 'reconnecting'

const listeners = new Set<(state: RealtimeConnectionState) => void>()
let realtimeConnectionState: RealtimeConnectionState = 'connected'

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey)

export function setRealtimeConnectionState(state: RealtimeConnectionState): void {
  if (realtimeConnectionState === state) {
    return
  }
  realtimeConnectionState = state
  for (const listener of listeners) {
    listener(realtimeConnectionState)
  }
}

export function getRealtimeConnectionState(): RealtimeConnectionState {
  return realtimeConnectionState
}

export function subscribeRealtimeConnectionState(listener: (state: RealtimeConnectionState) => void): () => void {
  listeners.add(listener)
  listener(realtimeConnectionState)
  return () => {
    listeners.delete(listener)
  }
}

export type { Session, User } from '@supabase/supabase-js'
