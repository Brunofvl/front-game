// Lista de participantes da sessão com status online.
import { TEAM_LABELS } from '@/lib/constants'
import type { Profile, SessionPlayer, Team } from '@/types/game.types'

interface PlayerListProps {
  players: SessionPlayer[]
  profiles: Profile[]
}

function getPlayersByTeam(players: SessionPlayer[], team: Team): SessionPlayer[] {
  return players.filter((player) => player.team === team && player.is_online)
}

function getPlayerName(userId: string, profiles: Profile[]): string {
  const profile = profiles.find((item) => item.id === userId)
  return profile?.name ?? 'Jogador'
}

export function PlayerList({ players, profiles }: PlayerListProps): React.JSX.Element {
  const viktorPlayers = getPlayersByTeam(players, 'viktor')
  const lucasPlayers = getPlayersByTeam(players, 'lucas')

  if (viktorPlayers.length === 0 && lucasPlayers.length === 0) {
    return <p className="text-sm text-slate-400">Nenhum jogador online no momento.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-4">
        <p className="mb-3 text-sm font-semibold text-purple-300">{`${TEAM_LABELS.viktor} (${viktorPlayers.length})`}</p>
        <div className="flex flex-wrap gap-2">
          {viktorPlayers.map((player) => (
            <span key={`${player.session_id}-${player.user_id}`} className="rounded-full border border-purple-400/40 bg-purple-600/20 px-3 py-1 text-xs text-purple-100">
              {getPlayerName(player.user_id, profiles)}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-orange-400/40 bg-orange-950/20 p-4">
        <p className="mb-3 text-sm font-semibold text-orange-300">{`${TEAM_LABELS.lucas} (${lucasPlayers.length})`}</p>
        <div className="flex flex-wrap gap-2">
          {lucasPlayers.map((player) => (
            <span key={`${player.session_id}-${player.user_id}`} className="rounded-full border border-orange-400/40 bg-orange-500/20 px-3 py-1 text-xs text-orange-100">
              {getPlayerName(player.user_id, profiles)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
