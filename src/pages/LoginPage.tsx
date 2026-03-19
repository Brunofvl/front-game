// Tela pública de entrada para identificar jogador e equipe antes da partida.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import type { Team } from '@/types/game.types'

export default function LoginPage(): React.JSX.Element {
  const { loginAsAdmin, loginAsPlayer, loading } = useAuth()
  const [name, setName] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [adminError, setAdminError] = useState('')

  const canPlayerLogin = name.trim().length >= 2 && selectedTeam !== null

  const handlePlayerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canPlayerLogin || !selectedTeam) {
      return
    }

    setErrorMessage('')
    try {
      await loginAsPlayer(name, selectedTeam)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao fazer login de jogador.')
    }
  }

  const handleAdminSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAdminError('')
    try {
      await loginAsAdmin(adminEmail, adminPassword)
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Credenciais inválidas para admin.')
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Quiz Corporativo</p>
          <h1 className="mt-2 text-3xl font-bold">Vitor vs Lucas</h1>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <form className="space-y-5" onSubmit={handlePlayerSubmit}>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">Seu nome</p>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Digite seu nome"
                className="h-12 border-slate-700 bg-slate-950 text-base text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedTeam('viktor')}
                className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition ${selectedTeam === 'viktor' ? 'scale-[1.02] border-purple-300 bg-purple-600 shadow-[0_0_20px_rgba(168,85,247,.45)]' : 'border-transparent bg-purple-600/80'}`}
              >
                Equipe Vitor
              </button>
              <button
                type="button"
                onClick={() => setSelectedTeam('lucas')}
                className={`rounded-xl border-2 px-4 py-4 text-sm font-semibold transition ${selectedTeam === 'lucas' ? 'scale-[1.02] border-orange-200 bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,.45)]' : 'border-transparent bg-orange-500/80'}`}
              >
                Equipe Lucas
              </button>
            </div>

            {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}

            <Button type="submit" className="h-12 w-full text-base" disabled={!canPlayerLogin || loading}>
              {loading ? 'Entrando...' : 'Entrar no Jogo'}
            </Button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <button
            type="button"
            className="text-xs font-medium text-slate-300 underline underline-offset-4"
            onClick={() => setShowAdmin((value) => !value)}
          >
            Acesso Admin
          </button>

          {showAdmin && (
            <form className="mt-4 space-y-3" onSubmit={handleAdminSubmit}>
              <Input
                type="email"
                placeholder="Email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
              <Input
                type="password"
                placeholder="Senha"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="border-slate-700 bg-slate-950 text-slate-100"
              />
              {adminError && <p className="text-xs text-red-300">{adminError}</p>}
              <Button type="submit" variant="outline" className="w-full border-slate-600 bg-slate-800 text-slate-100" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar como Admin'}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
