import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { tokenStorage } from '../api/client'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

const PROFILE = { id: 'u1', email: 'a@a.com', firstName: 'Ada', lastName: 'Lovelace' }

function TestConsumer() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <p data-testid="loading">{String(isLoading)}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="user">{user?.email ?? 'none'}</p>
      <button onClick={() => login('a@a.com', 'secret')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  )
}

function renderConsumer() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("ne fait aucun appel réseau et reste non authentifié si aucun token n'est stocké", async () => {
    const meHandler = vi.fn(() => HttpResponse.json(PROFILE))
    server.use(http.get('/api/auth/me', meHandler))

    renderConsumer()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(meHandler).not.toHaveBeenCalled()
  })

  it('charge le profil courant au montage si un access token est déjà stocké', async () => {
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(http.get('/api/auth/me', () => HttpResponse.json(PROFILE)))

    renderConsumer()

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@a.com'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
  })

  it('efface les jetons et reste non authentifié si /auth/me échoue', async () => {
    tokenStorage.setTokens({ accessToken: 'stale', refreshToken: 'ref', expiresIn: 3600 })
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))

    renderConsumer()

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(tokenStorage.getAccessToken()).toBeNull()
  })

  it('login() authentifie un token puis recharge le profil courant', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      ),
      http.get('/api/auth/me', () => HttpResponse.json(PROFILE)),
    )

    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@a.com'))
    expect(tokenStorage.getAccessToken()).toBe('new-access')
  })

  it('logout() efface le profil courant', async () => {
    const user = userEvent.setup()
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(PROFILE)),
      http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
    )

    renderConsumer()
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))

    await user.click(screen.getByText('logout'))

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})
