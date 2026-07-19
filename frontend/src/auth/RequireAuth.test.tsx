import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../api/client'
import { AuthProvider } from './AuthContext'
import { RequireAuth } from './RequireAuth'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>Secret</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

// Un chemin par service métier réveillé par useServicesWarmup (voir RequireAuth.tsx) :
// à mocker en plus de /auth/me pour laisser passer la porte du réveil dans ces tests.
const warmupHandlers = [
  http.get('/api/properties', () => HttpResponse.json([])),
  http.get('/api/tenants', () => HttpResponse.json([])),
  http.get('/api/leases', () => HttpResponse.json([])),
  http.get('/api/payments', () => HttpResponse.json([])),
  http.get('/api/documents', () => HttpResponse.json([])),
]

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('affiche un état de chargement pendant la résolution de la session', () => {
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })),
      ...warmupHandlers,
    )

    renderAt('/private')

    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche le contenu protégé une fois authentifié et les services réveillés', async () => {
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })),
      ...warmupHandlers,
    )

    renderAt('/private')

    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())
  })

  it('affiche "Réveil des services…" tant que les services métier ne répondent pas encore', async () => {
    // Avec des handlers qui répondent instantanément, la fenêtre "Réveil des services…" est
    // trop brève pour qu'un waitFor l'observe de façon fiable (voir useServicesWarmup.test.ts
    // pour le même besoin) : on fait échouer /tenants une première fois (502) pour créer un
    // délai observable avant que useServicesWarmup ne le retente.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let tenantAttempts = 0
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })),
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => {
        tenantAttempts += 1
        return tenantAttempts < 2
          ? new HttpResponse(null, { status: 502 })
          : HttpResponse.json([])
      }),
      http.get('/api/leases', () => HttpResponse.json([])),
      http.get('/api/payments', () => HttpResponse.json([])),
      http.get('/api/documents', () => HttpResponse.json([])),
    )

    renderAt('/private')

    await waitFor(() => expect(screen.getByText('Réveil des services…')).toBeInTheDocument())
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(4000)
    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())
    expect(tenantAttempts).toBeGreaterThanOrEqual(2)

    vi.useRealTimers()
  })

  it('affiche un message avec bouton "Réessayer" si un service ne répond jamais dans le délai maximal', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })),
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => new HttpResponse(null, { status: 502 })),
      http.get('/api/leases', () => HttpResponse.json([])),
      http.get('/api/payments', () => HttpResponse.json([])),
      http.get('/api/documents', () => HttpResponse.json([])),
    )

    renderAt('/private')

    await vi.advanceTimersByTimeAsync(181000)
    await waitFor(() =>
      expect(
        screen.getByText('Le démarrage des services prend plus de temps que prévu.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('redirige vers /login si non authentifié', async () => {
    renderAt('/private')

    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })
})
