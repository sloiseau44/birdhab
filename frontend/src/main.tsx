import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isRateLimited } from './lib/errors.ts'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Par défaut, React Query relance 3 fois n'importe quelle requête en échec — sur un
      // 429 Render (service gratuit en cours de réveil, voir isRateLimited), relancer ne
      // fait qu'aggraver le blocage plutôt que d'aider. RequireAuth/useServicesWarmup
      // couvrent déjà le réveil proactif ; ce garde-fou reste pour les requêtes qui y
      // échapperaient (ex. relancées après le délai maximal de réveil).
      retry: (failureCount, error) => failureCount < 2 && !isRateLimited(error),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
