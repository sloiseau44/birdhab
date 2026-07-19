import { useEffect, useState } from 'react'
import axios from 'axios'
import { isServiceUnavailable } from './errors'

const RETRY_DELAY_MS = 4000
// Chaîne à 2 sauts (Gateway -> auth), chacun pouvant cold-starter indépendamment jusqu'à
// ~2 min sur ce tier gratuit (observé en usage réel) : la Gateway doit d'abord démarrer
// avant même de pouvoir transmettre la requête à auth, qui démarre alors à son tour — pire
// cas proche de la somme des deux plutôt que du max, contrairement à useServicesWarmup
// (services indépendants réveillés en parallèle). D'où un plafond plus généreux ici.
const MAX_WARMUP_MS = 180000

/**
 * Tente silencieusement de réveiller la chaîne Gateway -> auth dès le montage (requête
 * directe, hors apiClient : /auth/me sans jeton déclencherait sinon la logique de refresh
 * de l'intercepteur, qui masquerait le vrai signal). Utilisé sur Login/RegisterPage pour
 * bloquer le bouton de connexion pendant le réveil d'un service gratuit Render plutôt que
 * de laisser l'utilisateur essuyer un 502/429 après avoir rempli le formulaire — ce qui,
 * avec un plafond trop court, le renvoie dans la boucle 429 -> compte à rebours -> 429
 * (voir isRateLimited/useCooldown) au lieu de vraiment attendre le réveil complet.
 * `hasTimedOut` distingue le cas où le plafond est atteint sans réponse valide, pour que
 * l'appelant prévienne clairement plutôt que de se taire.
 */
export function useBackendWarmup() {
  const [isWarmingUp, setIsWarmingUp] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    const deadline = Date.now() + MAX_WARMUP_MS

    async function ping() {
      try {
        await axios.get('/api/auth/me')
      } catch (err) {
        if (cancelled) return
        if (isServiceUnavailable(err)) {
          if (Date.now() < deadline) {
            timeoutId = window.setTimeout(ping, RETRY_DELAY_MS)
            return
          }
          if (!cancelled) setHasTimedOut(true)
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

  return { isWarmingUp, hasTimedOut }
}
