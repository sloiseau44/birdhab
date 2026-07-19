import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
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

  it('reste en réveil tant que la réponse est en attente, puis se débloque une fois qu\'elle arrive (une seule requête, pas de nouvelle tentative)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(
      ...businessReadyHandlers,
      http.get('/api/auth/me', async () => {
        await delay(140000)
        return new HttpResponse(null, { status: 401 })
      }),
    )
    const { result } = renderHook(() => useBackendWarmup())

    await vi.advanceTimersByTimeAsync(60000)
    expect(result.current.isWarmingUp).toBe(true)

    await vi.advanceTimersByTimeAsync(90000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(false)
  })

  it('bascule sur hasTimedOut dès qu\'un chemin répond 502, sans nouvelle tentative', async () => {
    server.use(...businessReadyHandlers, http.get('/api/auth/me', () => new HttpResponse(null, { status: 502 })))
    const { result } = renderHook(() => useBackendWarmup())

    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(true)
  })
})
