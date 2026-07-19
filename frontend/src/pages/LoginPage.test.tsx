import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { AuthProvider } from '../auth/AuthContext'
import { LoginPage } from './LoginPage'

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  // Le bouton démarre désactivé ("Préparation du service…") tant que useBackendWarmup n'a
  // pas confirmé que tous les services répondent — voir warmupHandlers.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument())
  await user.type(screen.getByLabelText('Email'), 'a@a.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

// Un chemin par service réveillé par useBackendWarmup (auth/gateway + les 5 métier) : tous
// à mocker pour que le réveil se débloque dans ces tests (voir WARMUP_PATHS dans le hook).
const warmupHandlers = [
  http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
  http.get('/api/properties', () => HttpResponse.json([])),
  http.get('/api/tenants', () => HttpResponse.json([])),
  http.get('/api/leases', () => HttpResponse.json([])),
  http.get('/api/payments', () => HttpResponse.json([])),
  http.get('/api/documents', () => HttpResponse.json([])),
]

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("affiche le message d'identifiants incorrects sur une 401 classique (pas de compte à rebours)", async () => {
    const user = userEvent.setup()
    server.use(...warmupHandlers, http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })))

    renderLoginPage()
    await fillAndSubmit(user)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect'),
    )
    expect(screen.getByRole('button', { name: 'Se connecter' })).not.toBeDisabled()
  })

  it('sur une 429 (service Render endormi), bloque le bouton avec un compte à rebours plutôt qu\'un message d\'échec', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    server.use(...warmupHandlers, http.post('/api/auth/login', () => new HttpResponse(null, { status: 429 })))

    renderLoginPage()
    await fillAndSubmit(user)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Le serveur se réveille après une période d'inactivité (offre gratuite) — réessaie dans 60s.",
      ),
    )
    const submitButton = screen.getByRole('button', { name: /Réessaie dans \d+s/ })
    expect(submitButton).toBeDisabled()

    act(() => vi.advanceTimersByTime(3000))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('réessaie dans 57s'))
  })

  it('affiche le bouton bloqué en "Préparation du service…" le temps du réveil silencieux (useBackendWarmup), puis le débloque', async () => {
    server.use(...warmupHandlers)

    renderLoginPage()

    expect(screen.getByRole('button', { name: 'Préparation du service…' })).toBeDisabled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Se connecter' })).not.toBeDisabled(),
    )
  })

  it('affiche un message explicite si un service répond 502 (une seule requête, pas de nouvelle tentative)', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 502 })), ...warmupHandlers)

    renderLoginPage()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Le serveur met plus de temps que prévu à démarrer (offre gratuite). Tu peux réessayer maintenant.',
      ),
    )
    expect(screen.getByRole('button', { name: 'Se connecter' })).not.toBeDisabled()
  })
})
