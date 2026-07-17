import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../auth/AuthContext'

function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

export function renderWithQueryClient(ui: ReactElement) {
  return render(<QueryClientProvider client={newQueryClient()}>{ui}</QueryClientProvider>)
}

/** À utiliser pour une page qui appelle useAuth() (ex. PaymentsPage) — nécessite un handler MSW pour GET /api/auth/me. */
export function renderWithAuth(ui: ReactElement) {
  return render(
    <QueryClientProvider client={newQueryClient()}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  )
}
