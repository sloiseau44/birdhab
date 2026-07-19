import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { AuthProvider } from '../auth/AuthContext'
import { RegisterPage } from './RegisterPage'

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  // Le bouton démarre désactivé ("Préparation du service…") tant que useBackendWarmup n'a
  // pas confirmé que la chaîne frontend -> gateway -> auth répond — voir warmupHandler.
  await waitFor(() => expect(screen.getByRole('button', { name: 'Créer mon compte' })).toBeInTheDocument())
  await user.type(screen.getByLabelText('Email'), 'a@a.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }))
}

const warmupHandler = http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 }))

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche le message générique sur un échec classique (pas de compte à rebours)', async () => {
    const user = userEvent.setup()
    server.use(
      warmupHandler,
      http.post('/api/auth/register', () =>
        HttpResponse.json({ message: 'Email déjà utilisé' }, { status: 409 }),
      ),
    )

    renderRegisterPage()
    await fillAndSubmit(user)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email déjà utilisé'))
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).not.toBeDisabled()
  })

  it('sur une 429 (service Render endormi), bloque le bouton avec un compte à rebours plutôt qu\'un message d\'échec', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup()
    server.use(warmupHandler, http.post('/api/auth/register', () => new HttpResponse(null, { status: 429 })))

    renderRegisterPage()
    await fillAndSubmit(user)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Le serveur se réveille après une période d'inactivité (offre gratuite) — réessaie dans 60s.",
      ),
    )
    const submitButton = screen.getByRole('button', { name: /Réessaie dans \d+s/ })
    expect(submitButton).toBeDisabled()

    act(() => vi.advanceTimersByTime(10000))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('réessaie dans 50s'))
  })

  it('affiche le bouton bloqué en "Préparation du service…" le temps du réveil silencieux (useBackendWarmup), puis le débloque', async () => {
    server.use(warmupHandler)

    renderRegisterPage()

    expect(screen.getByRole('button', { name: 'Préparation du service…' })).toBeDisabled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Créer mon compte' })).not.toBeDisabled(),
    )
  })

  it('affiche un message explicite si le réveil dépasse le délai maximal (Gateway/auth toujours indisponibles)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 502 })))

    renderRegisterPage()

    await vi.advanceTimersByTimeAsync(181000)
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Le serveur met plus de temps que prévu à démarrer (offre gratuite). Tu peux réessayer maintenant.',
      ),
    )
    expect(screen.getByRole('button', { name: 'Créer mon compte' })).not.toBeDisabled()
  })
})
