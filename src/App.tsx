// Componente raiz que delega toda navegação para o roteador da aplicação.
import { AppRouter } from '@/router/AppRouter'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'
import { useAuth } from '@/hooks/useAuth'

function App(): React.JSX.Element {
  useAuth(true)
  return (
    <>
      <ConnectionStatus />
      <AppRouter />
    </>
  )
}

export default App
