Tenho um quiz corporativo React + TypeScript + Supabase + Zustand.
No Prompt anterior criei um servidor Go que expõe SSE em GET /events.
Agora preciso substituir os hooks que usavam Supabase Realtime por hooks
que consomem esse servidor SSE.
O que o servidor SSE envia
A cada ~1s chega um evento SSE com este formato:
event: state_update
data: <JSON do GameState>

event: ping
data: {"timestamp": "..."}
Tipo GameState completo:
typescriptinterface GameState {
  session: GameSession | null
  current_question: Question | null
  answer_stats: AnswerStats | null
  question_result: QuestionResult | null
  leaderboard: LeaderboardEntry[]
  players: SessionPlayer[]
  timestamp: string
}

interface AnswerStats {
  total_players: number
  answered_count: number
  answered_pct: number
  viktor_answered: number
  lucas_answered: number
  viktor_correct_pct: number
  lucas_correct_pct: number
}
Os outros tipos (GameSession, Question, QuestionResult, LeaderboardEntry,
SessionPlayer) já existem em src/types/game.types.ts — não recriar.
Variável de ambiente nova
Adicionar ao .env.example:
VITE_SSE_URL=http://localhost:8080
Adicionar ao src/lib/config.ts:
typescriptsseUrl: import.meta.env.VITE_SSE_URL as string,
O que criar
1. src/hooks/useSSE.ts — hook base (baixo nível)
Hook genérico que gerencia a conexão EventSource:
typescript// Deve expor:
// - data: T | null          ← último GameState recebido
// - connected: boolean      ← true quando EventSource.readyState === OPEN
// - error: string | null
//
// Comportamento:
// - Cria EventSource apontando para VITE_SSE_URL + '/events'
// - Escuta evento 'state_update' e atualiza `data`
// - Escuta evento 'error' do EventSource e atualiza `connected`
// - Escuta evento 'open' e marca connected = true
// - EventSource reconecta automaticamente (comportamento nativo)
// - No cleanup (unmount), chama eventSource.close()
// - Não recria o EventSource desnecessariamente (sem deps que mudem)
2. src/hooks/useGameSession.ts — SUBSTITUIR o atual
O atual usa Supabase Realtime (que está instável).
O novo deve usar useSSE:
typescript// Deve expor: { session, loading, error }
// (mesma interface de antes — não quebra os componentes existentes)
//
// Comportamento:
// - Usa useSSE para receber GameState
// - Extrai `session` do GameState e atualiza o Zustand gameStore
// - Quando session.status mudar, navega automaticamente:
//     'waiting'   → /waiting
//     'question'  → /question
//     'revealing' → permanece em /question
//     'result'    → /result
//     'finished'  → /result
// - `loading` é true até o primeiro evento chegar
// - Não duplicar navegação (checar se já está na rota certa antes de navegar)
3. src/hooks/useLiveStats.ts — SUBSTITUIR o atual
typescript// Deve expor: AnswerStats | null
// (compatível com o que AdminPage e ScoreboardPage já usam)
//
// Usa useSSE e extrai answer_stats do GameState.
// Atualiza a cada evento — sem lógica adicional.
4. src/hooks/useQuestionResult.ts — SUBSTITUIR o atual
typescript// Deve expor: { result: QuestionResult | null, leaderboard: LeaderboardEntry[], loading: boolean }
//
// Usa useSSE e extrai question_result + leaderboard do GameState.
// loading = true até question_result não ser null.
5. src/hooks/useSessionPlayers.ts — SUBSTITUIR o atual
typescript// Deve expor: SessionPlayer[]
//
// Usa useSSE e extrai players do GameState.
6. src/components/ui/ConnectionStatus.tsx — ATUALIZAR
O componente atual mostrava status do Realtime do Supabase.
Atualize para usar o connected do useSSE:
typescript// Visual (discreto, canto superior direito, z-50):
// 🟢 ponto verde animado  → "Conectado"    (connected = true)
// 🔴 ponto vermelho + texto → "Reconectando..."  (connected = false)
//
// Quando reconectar (false → true): some após 2s
// Quando desconectar (true → false): aparece imediatamente
Importante: useSSE é singleton
O EventSource deve ser criado uma única vez na aplicação, não por hook.
Use um módulo singleton fora do React para evitar múltiplas conexões:
typescript// src/lib/sseClient.ts
//
// Exporta uma instância única do EventSource.
// Os hooks apenas escutam os eventos emitidos por ela.
// Abordagem: custom EventEmitter simples ou callbacks registrados.
//
// Motivo: se 5 hooks usarem EventSource separado, serão 5 conexões
// simultâneas ao servidor Go — queremos apenas 1.
Estrutura sugerida para sseClient.ts:
typescripttype Listener = (state: GameState) => void

class SSEClient {
  private es: EventSource | null = null
  private listeners: Set<Listener> = new Set()
  private _connected = false
  private _lastState: GameState | null = null

  connect(url: string): void { ... }   // cria EventSource se não existir
  disconnect(): void { ... }            // fecha e limpa
  subscribe(fn: Listener): () => void { ... }  // retorna unsubscribe
  get connected(): boolean { ... }
  get lastState(): GameState | null { ... }
}

export const sseClient = new SSEClient()
O useSSE chama sseClient.connect() no mount e sseClient.subscribe() para receber updates.
Compatibilidade com escrita no Supabase
Os hooks de escrita (useAnswers.ts, useAdminControls.ts) não mudam.
Eles continuam usando o supabase client diretamente.
Só os hooks de leitura/escuta são substituídos.
Regra de navegação (detalhe importante)
Ao receber um novo status via SSE, só navegue se o status realmente mudou:
typescript// Guarde o status anterior e compare
const prevStatusRef = useRef<string | null>(null)

useEffect(() => {
  if (!session) return
  if (session.status === prevStatusRef.current) return  // sem mudança, ignora
  prevStatusRef.current = session.status
  // ... navegar
}, [session?.status])
Isso evita redirecionamentos em loop a cada poll de 1s.
Teste local
Para testar antes de ter o servidor Go rodando, crie um mock:
typescript// src/lib/sseMock.ts  (usar apenas em dev se VITE_USE_MOCK_SSE=true)
//
// Simula eventos SSE localmente sem precisar do servidor Go.
// Alterna o status da sessão a cada 5s para testar navegação.
// Não precisa ser sofisticado — só para validar os hooks.
Estrutura final dos arquivos a criar/modificar
src/
  lib/
    sseClient.ts         ← CRIAR (singleton EventSource)
    sseMock.ts           ← CRIAR (mock para dev)
    config.ts            ← ATUALIZAR (adicionar sseUrl)
  hooks/
    useSSE.ts            ← CRIAR (hook base)
    useGameSession.ts    ← SUBSTITUIR
    useLiveStats.ts      ← SUBSTITUIR
    useQuestionResult.ts ← SUBSTITUIR
    useSessionPlayers.ts ← SUBSTITUIR
  components/
    ui/
      ConnectionStatus.tsx ← ATUALIZAR
Observações finais

Manter as mesmas interfaces expostas pelos hooks (não quebrar páginas existentes)
TypeScript estrito, sem any
O sseClient conecta automaticamente ao importar (ou ao primeiro useSSE montar)
Em produção, VITE_SSE_URL aponta para https://suavps.com/quiz-sse (com Nginx na frente)

Entregável
Todos os arquivos listados com código real e funcional.
Após aplicar, o projeto deve compilar sem erros com npm run dev.