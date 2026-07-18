import { useEffect, useState } from 'react'
import axios from 'axios'

const RETRY_DELAY_MS = 4000
const MAX_WARMUP_MS = 60000

/**
 * Un service Render gratuit endormi répond 429 ("hibernate-rate-limited") ou 502
 * (page générique Render, service pas encore joignable) pendant son réveil — jamais
 * une réponse applicative. Tout le reste (y compris un 401, cas normal d'un visiteur
 * pas connecté) veut dire que la chaîne frontend -> gateway -> auth répond réellement.
 */
function isBackendUnavailable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return true // erreur réseau, aucune réponse du tout : pas prêt
  }
  const status = (error as { response?: { status?: number } }).response?.status
  return status === 429 || (typeof status === 'number' && status >= 502 && status <= 504)
}

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
        if (isBackendUnavailable(err) && Date.now() < deadline) {
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
