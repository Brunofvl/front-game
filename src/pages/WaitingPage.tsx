// Tela de espera do jogador enquanto o admin prepara a próxima pergunta.
import { useEffect, useState } from 'react'
import { PlayerList } from '@/components/game/PlayerList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useGameSession } from '@/hooks/useGameSession'
import { useSessionPlayers } from '@/hooks/useSessionPlayers'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useGameStore } from '@/store/gameStore'
import type { Profile } from '@/types/game.types'

export default function WaitingPage(): React.JSX.Element {
  const { logout, loading: authLoading } = useAuth()
  const profile = useAuthStore((state) => state.profile)
  const players = useGameStore((state) => state.players)
  const { session, loading, error } = useGameSession()
  const [profiles, setProfiles] = useState<Profile[]>([])

  useSessionPlayers(session?.id ?? null)

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!session?.id) {
        setProfiles([])
        return
      }

      const playerIds = players.map((player) => player.user_id)
      if (playerIds.length === 0) {
        setProfiles([])
        return
      }

      const { data } = await supabase.from('profiles').select('*').in('id', playerIds)
      setProfiles((data as Profile[] | null) ?? [])
    }

    void fetchProfiles()
  }, [players, session?.id])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-8">
      <Card className="w-full border-slate-700 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle>{profile?.name ?? 'Jogador'}</CardTitle>
          <p className="text-sm text-slate-300">{profile?.team === 'viktor' ? 'Equipe Viktor' : 'Equipe Lucas'}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="h-4 w-4 animate-pulse rounded-full bg-purple-500" />
            <p className="text-sm text-slate-200">Aguardando o jogo iniciar...</p>
          </div>
          {loading && <p className="text-sm text-slate-300">Carregando sessão ativa...</p>}
          {error && <p className="text-sm text-red-300">{error}</p>}
          <PlayerList players={players} profiles={profiles} />
          <Button variant="ghost" className="text-slate-300" onClick={() => void logout()} disabled={authLoading}>
            {authLoading ? 'Saindo...' : 'Sair'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
