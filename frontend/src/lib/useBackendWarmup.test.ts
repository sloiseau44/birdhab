import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { useBackendWarmup } from './useBackendWarmup'

// Un chemin par service métier réveillé par useBackendWarmup, en plus de /auth/me (défini
// séparément dans chaque test ci-dessous, pour pouvoir le surcharger sans dupliquer le
// même chemin deux fois dans un même server.use — MSW retient le premier handler qui
// matche, pas le dernier).
const businessReadyHandlers = [
  http.get('/api/properties', () => HttpResponse.json([])),
  http.get('/api/tenants', () => HttpResponse.json([])),
  http.get('/api/leases', () => HttpResponse.json([])),
  http.get('/api/payments', () => HttpResponse.json([])),
  http.get('/api/documents', () => HttpResponse.json([])),
]

describe('useBackendWarmup', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('commence en train de "préparer" le service', () => {
    server.use(...businessReadyHandlers, http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    const { result } = renderHook(() => useBackendWarmup())
    expect(result.current.isWarmingUp).toBe(true)
  })

  it('se débloque dès qu\'une vraie réponse applicative arrive sur tous les chemins (401 = visiteur non connecté, la chaîne fonctionne)', async () => {
    server.use(...businessReadyHandlers, http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    const { result } = renderHook(() => useBackendWarmup())
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(false)
  })

  it('reste bloqué tant qu\'un seul chemin répond encore 502/429, se débloque dès une vraie réponse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let attempt = 0
    server.use(
      ...businessReadyHandlers,
      http.get('/api/auth/me', () => {
        attempt += 1
        return attempt < 3
          ? new HttpResponse(null, { status: 502 })
          : new HttpResponse(null, { status: 401 })
      }),
    )
    const { result } = renderHook(() => useBackendWarmup())

    await vi.advanceTimersByTimeAsync(4000)
    expect(result.current.isWarmingUp).toBe(true)

    await vi.advanceTimersByTimeAsync(4000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(attempt).toBeGreaterThanOrEqual(3)
  })

  it('se débloque après le délai maximal, avec hasTimedOut, si un chemin ne répond jamais correctement', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(...businessReadyHandlers, http.get('/api/auth/me', () => new HttpResponse(null, { status: 502 })))
    const { result } = renderHook(() => useBackendWarmup())

    await vi.advanceTimersByTimeAsync(181000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(true)
  })
})
