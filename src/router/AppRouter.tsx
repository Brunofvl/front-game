// Configuração central de rotas com proteção por autenticação e perfil.
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminPage from '@/pages/AdminPage'
import LoginPage from '@/pages/LoginPage'
import QuestionPage from '@/pages/QuestionPage'
import ResultPage from '@/pages/ResultPage'
import ScoreboardPage from '@/pages/ScoreboardPage'
import WaitingPage from '@/pages/WaitingPage'
import { useAuthStore } from '@/store/authStore'
import type { PlayerRole } from '@/types/game.types'

interface ProtectedRouteProps {
  role?: PlayerRole
}

function ProtectedRoute({ role }: ProtectedRouteProps): React.JSX.Element {
  const profile = useAuthStore((state) => state.profile)

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (role && profile.role !== role) {
    return <Navigate to="/waiting" replace />
  }

  return <Outlet />
}

export function AppRouter(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/scoreboard" element={<ScoreboardPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/waiting" element={<WaitingPage />} />
        <Route path="/question" element={<QuestionPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
