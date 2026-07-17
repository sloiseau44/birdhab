import { beforeEach, describe, expect, it } from 'vitest'
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

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('affiche un état de chargement pendant la résolution de la session', () => {
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })))

    renderAt('/private')

    expect(screen.getByText('Chargement…')).toBeInTheDocument()
  })

  it('affiche le contenu protégé une fois authentifié', async () => {
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ id: 'u1', email: 'a@a.com' })))

    renderAt('/private')

    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())
  })

  it('redirige vers /login si non authentifié', async () => {
    renderAt('/private')

    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument())
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })
})
