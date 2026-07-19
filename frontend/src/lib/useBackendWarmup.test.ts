import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { useBackendWarmup } from './useBackendWarmup'

describe('useBackendWarmup', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('commence en train de "préparer" le service', () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    const { result } = renderHook(() => useBackendWarmup())
    expect(result.current.isWarmingUp).toBe(true)
  })

  it('se débloque dès qu\'une vraie réponse applicative arrive (401 = visiteur non connecté, la chaîne fonctionne)', async () => {
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })))
    const { result } = renderHook(() => useBackendWarmup())
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(false)
  })

  it('reste bloqué tant que le backend répond 502/429, se débloque dès une vraie réponse', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let attempt = 0
    server.use(
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

  it('se débloque après le délai maximal, avec hasTimedOut, si le backend ne répond jamais correctement', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    server.use(http.get('/api/auth/me', () => new HttpResponse(null, { status: 502 })))
    const { result } = renderHook(() => useBackendWarmup())

    await vi.advanceTimersByTimeAsync(181000)
    await waitFor(() => expect(result.current.isWarmingUp).toBe(false))
    expect(result.current.hasTimedOut).toBe(true)
  })
})
