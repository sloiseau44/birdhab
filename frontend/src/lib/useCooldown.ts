import { useEffect, useRef, useState } from 'react'

/** Compte à rebours en secondes, pour bloquer un bouton le temps qu'un service se réveille (voir isRateLimited). */
export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [])

  function start(seconds: number) {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    setSecondsLeft(seconds)
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current !== null) clearInterval(intervalRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  return { secondsLeft, start }
}
