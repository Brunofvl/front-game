export const config = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL || import.meta.env.JOGO_VITE_SUPABASE_URL) as string,
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.JOGO_VITE_SUPABASE_ANON_KEY) as string,
  sseUrl: (import.meta.env.VITE_SSE_URL || import.meta.env.JOGO_VITE_SSE_URL) as string,
  questionDurationMs: Number(import.meta.env.VITE_QUESTION_DURATION_MS ?? 20000),
}
