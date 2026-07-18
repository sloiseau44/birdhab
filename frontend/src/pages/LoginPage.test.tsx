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
  await user.type(screen.getByLabelText('Email'), 'a@a.com')
  await user.type(screen.getByLabelText('Mot de passe'), 'secret123')
  await user.click(screen.getByRole('button', { name: 'Se connecter' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("affiche le message d'identifiants incorrects sur une 401 classique (pas de compte à rebours)", async () => {
    const user = userEvent.setup()
    server.use(http.post('/api/auth/login', () => new HttpResponse(null, { status: 401 })))

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
    server.use(http.post('/api/auth/login', () => new HttpResponse(null, { status: 429 })))

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
})
