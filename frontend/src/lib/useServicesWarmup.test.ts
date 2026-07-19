import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
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

  it("reste bloqué tant qu'un seul des services répond encore 502/429, même si les autres sont prêts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let tenantAttempts = 0
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])), // prêt dès le premier essai
      http.get('/api/tenants', () => {
        tenantAttempts += 1
        return tenantAttempts < 2
          ? new HttpResponse(null, { status: 502 })
          : HttpResponse.json([])
      }),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))

    await vi.advanceTimersByTimeAsync(1500)
    expect(result.current.isWarmingUp).toBe(true) // properties seul répond, tenants pas encore

    await vi.advanceTimersByTimeAsync(16000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(tenantAttempts).toBeGreaterThanOrEqual(2)
  })

  it('se débloque après le délai maximal, avec hasTimedOut, si un service ne répond jamais correctement', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => new HttpResponse(null, { status: 502 })),
    )
    const { result } = renderHook(() => useServicesWarmup(['/properties', '/tenants']))

    await vi.advanceTimersByTimeAsync(181000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(true)
  })
})
