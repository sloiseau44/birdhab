import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { apiClient, tokenStorage } from './client'

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("attache le token d'accès aux requêtes sortantes quand présent", async () => {
    tokenStorage.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 3600 })
    let receivedAuth: string | null = null
    server.use(
      http.get('/api/ping', ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiClient.get('/ping')

    expect(receivedAuth).toBe('Bearer access-1')
  })

  it("n'attache aucun header Authorization sans token stocké", async () => {
    let receivedAuth: string | null = 'not-set'
    server.use(
      http.get('/api/ping', ({ request }) => {
        receivedAuth = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiClient.get('/ping')

    expect(receivedAuth).toBeNull()
  })

  it('rafraîchit le token sur une réponse 401 puis rejoue la requête originale', async () => {
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'refresh-1', expiresIn: 3600 })
    let pingCallCount = 0
    server.use(
      http.get('/api/ping', ({ request }) => {
        pingCallCount += 1
        const auth = request.headers.get('authorization')
        if (auth === 'Bearer expired') {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ auth })
      }),
      http.post('/api/auth/refresh', async ({ request }) => {
        const body = (await request.json()) as { refreshToken: string }
        expect(body.refreshToken).toBe('refresh-1')
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'refresh-2' })
      }),
    )

    const response = await apiClient.get('/ping')

    expect(response.data).toEqual({ auth: 'Bearer fresh' })
    expect(pingCallCount).toBe(2)
    expect(tokenStorage.getAccessToken()).toBe('fresh')
    expect(tokenStorage.getRefreshToken()).toBe('refresh-2')
  })

  it('déduplique les rafraîchissements concurrents : un seul appel /auth/refresh pour deux 401 simultanées', async () => {
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'refresh-1', expiresIn: 3600 })
    let refreshCallCount = 0
    const respond = (request: Request, ok: string) =>
      request.headers.get('authorization') === 'Bearer expired'
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json({ ok })
    server.use(
      http.get('/api/a', ({ request }) => respond(request, 'a')),
      http.get('/api/b', ({ request }) => respond(request, 'b')),
      http.post('/api/auth/refresh', () => {
        refreshCallCount += 1
        return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'refresh-2' })
      }),
    )

    const [a, b] = await Promise.all([apiClient.get('/a'), apiClient.get('/b')])

    expect(a.data).toEqual({ ok: 'a' })
    expect(b.data).toEqual({ ok: 'b' })
    expect(refreshCallCount).toBe(1)
  })

  it('efface les jetons et propage l\'erreur si le rafraîchissement échoue', async () => {
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'invalid', expiresIn: 3600 })
    server.use(
      http.get('/api/ping', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/auth/refresh', () => new HttpResponse(null, { status: 401 })),
    )

    await expect(apiClient.get('/ping')).rejects.toBeTruthy()

    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it('ne rejoue jamais une deuxième fois si la requête rejouée échoue aussi en 401', async () => {
    tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'refresh-1', expiresIn: 3600 })
    let pingCallCount = 0
    server.use(
      http.get('/api/ping', () => {
        pingCallCount += 1
        return new HttpResponse(null, { status: 401 })
      }),
      http.post('/api/auth/refresh', () =>
        HttpResponse.json({ accessToken: 'still-invalid', refreshToken: 'refresh-2' }),
      ),
    )

    await expect(apiClient.get('/ping')).rejects.toBeTruthy()

    // Requête initiale + un seul rejeu (drapeau _retried) : jamais de 3e appel.
    expect(pingCallCount).toBe(2)
  })
})
