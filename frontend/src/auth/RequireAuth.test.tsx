import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse, delay } from 'msw'
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

  it('affiche "Réveil des services…" tant qu\'une réponse est en attente, puis débloque une fois qu\'elle arrive', async () => {
    // Une seule requête par chemin, pas de nouvelle tentative (voir useWarmup.ts) : on
    // simule un service encore endormi via une réponse retardée plutôt qu'un 502 immédiat,
    // pour observer un état "Réveil des services…" qui dure réellement.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })),
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', async () => {
        await delay(140000)
        return HttpResponse.json([])
      }),
      http.get('/api/leases', () => HttpResponse.json([])),
      http.get('/api/payments', () => HttpResponse.json([])),
      http.get('/api/documents', () => HttpResponse.json([])),
    )

    renderAt('/private')

    await waitFor(() => expect(screen.getByText('Réveil des services…')).toBeInTheDocument())
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(60000)
    expect(screen.getByText('Réveil des services…')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(90000)
    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())

    vi.useRealTimers()
  })

  it('affiche un message avec bouton "Réessayer" si un service répond 502 (une seule requête, pas de nouvelle tentative)', async () => {
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

    await waitFor(() =>
      expect(
        screen.getByText('Le démarrage des services prend plus de temps que prévu.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })

  it('redirige vers /login si non authentifié', async () => {
    renderAt('/private')

    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })
})
