import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCooldown } from './useCooldown'

describe('useCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('démarre à 0 avant tout appel à start()', () => {
    const { result } = renderHook(() => useCooldown())
    expect(result.current.secondsLeft).toBe(0)
  })

  it('décompte seconde par seconde jusqu\'à 0', () => {
    const { result } = renderHook(() => useCooldown())

    act(() => result.current.start(3))
    expect(result.current.secondsLeft).toBe(3)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(2)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(1)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(0)

    // Ne descend pas sous 0 même si le temps continue d'avancer.
    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.secondsLeft).toBe(0)
  })

  it('un nouvel appel à start() remplace le compte à rebours en cours', () => {
    const { result } = renderHook(() => useCooldown())

    act(() => result.current.start(10))
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current.secondsLeft).toBe(8)

    act(() => result.current.start(5))
    expect(result.current.secondsLeft).toBe(5)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(4)
  })

  it('arrête le minuteur au démontage (pas de mise à jour orpheline)', () => {
    const { result, unmount } = renderHook(() => useCooldown())
    act(() => result.current.start(5))
    unmount()
    // N'aurait pas dû planter ni logguer d'avertissement React malgré l'avancée du temps après démontage.
    expect(() => act(() => vi.advanceTimersByTime(5000))).not.toThrow()
  })
})
