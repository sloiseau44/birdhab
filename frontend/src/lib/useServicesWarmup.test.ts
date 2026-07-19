import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../test/server'
import { useServicesWarmup } from './useServicesWarmup'

describe('useServicesWarmup', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('commence en train de "préparer" les services', () => {
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([])),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))
    expect(result.current.isWarmingUp).toBe(true)
  })

  it('se débloque une fois que tous les chemins ont répondu', async () => {
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([])),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(false)
  })

  it("reste bloqué tant qu'une réponse est en attente, même si les autres sont déjà prêts (une seule requête, pas de nouvelle tentative)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])), // prêt dès le premier essai
      http.get('/api/tenants', async () => {
        await delay(140000)
        return HttpResponse.json([])
      }),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))

    await vi.advanceTimersByTimeAsync(60000)
    expect(result.current.isWarmingUp).toBe(true) // properties déjà prêt, tenants toujours en attente

    await vi.advanceTimersByTimeAsync(90000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(false)
  })

  it('bascule sur hasTimedOut dès qu\'un service répond 502, sans nouvelle tentative', async () => {
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => new HttpResponse(null, { status: 502 })),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))

    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(true)
  })
})
