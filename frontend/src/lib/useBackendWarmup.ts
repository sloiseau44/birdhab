import { useEffect, useState } from 'react'
import axios from 'axios'
import { isServiceUnavailable } from './errors'

const RETRY_DELAY_MS = 4000
const MAX_WARMUP_MS = 60000

/**
 * Tente silencieusement de réveiller la chaîne Gateway -> auth dès le montage (requête
 * directe, hors apiClient : /auth/me sans jeton déclencherait sinon la logique de refresh
 * de l'intercepteur, qui masquerait le vrai signal). Utilisé sur Login/RegisterPage pour
 * bloquer le bouton de connexion pendant le réveil d'un service gratuit Render plutôt que
 * de laisser l'utilisateur essuyer un 502/429 après avoir rempli le formulaire.
 */
export function useBackendWarmup() {
  const [isWarmingUp, setIsWarmingUp] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    const deadline = Date.now() + MAX_WARMUP_MS

    async function ping() {
      try {
        await axios.get('/api/auth/me')
      } catch (err) {
        if (cancelled) return
        if (isServiceUnavailable(err) && Date.now() < deadline) {
          timeoutId = window.setTimeout(ping, RETRY_DELAY_MS)
          return
        }
      }
      if (!cancelled) setIsWarmingUp(false)
    }

    ping()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [])

  return { isWarmingUp }
}
