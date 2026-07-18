import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { isServiceUnavailable } from './errors'

const RETRY_DELAY_MS = 4000
// 5 services Spring Boot (JVM) jamais sollicités depuis le login (contrairement à
// auth/gateway, réveillés par useBackendWarmup) cold-startent ici pour la première fois,
// en parallèle, sur un tier gratuit à ressources partagées : observé en usage réel à plus
// de 60s combinées avant qu'ils ne répondent tous, d'où ce délai plus généreux.
const MAX_WARMUP_MS = 150000

/**
 * Chaque microservice Render gratuit s'endort et se réveille indépendamment des autres —
 * réveiller `auth` (voir useBackendWarmup, utilisé à la connexion) ne réveille pas
 * `property`/`tenant`/`lease`/`payment`/`document`. Sans ce hook, le premier écran visité
 * après connexion (tableau de bord ou une page CRUD) déclenche autant de requêtes que de
 * services encore endormis, chacune relancée indépendamment par React Query — un vrai
 * "orage" de requêtes observé en usage réel, qui aggrave le rate-limit Render (429) au
 * lieu d'aider. Ping en parallèle de chaque chemin donné (via apiClient : contrairement à
 * useBackendWarmup, on est déjà authentifié ici, donc un 401 mérite la logique normale de
 * refresh de l'intercepteur plutôt que d'être ignoré), tant qu'au moins un répond encore
 * 429/502/503/504. "Prêt" dès que tous ont eu une vraie réponse applicative, ou après
 * MAX_WARMUP_MS dans tous les cas pour ne jamais bloquer indéfiniment — `hasTimedOut`
 * distingue ce cas pour que l'appelant affiche un message explicite plutôt que de rendre
 * une page dont les propres requêtes échoueront à leur tour silencieusement.
 */
export function useServicesWarmup(paths: string[]) {
  const [isWarmingUp, setIsWarmingUp] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const pathsKey = paths.join(',')

  useEffect(() => {
    let cancelled = false
    const deadline = Date.now() + MAX_WARMUP_MS

    async function pingUntilReady(path: string): Promise<boolean> {
      for (;;) {
        try {
          await apiClient.get(path)
          return true
        } catch (err) {
          if (cancelled) return true
          if (!isServiceUnavailable(err)) return true
          if (Date.now() >= deadline) return false
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
    }

    Promise.all(pathsKey.split(',').filter(Boolean).map(pingUntilReady)).then((results) => {
      if (cancelled) return
      setHasTimedOut(results.some((ready) => !ready))
      setIsWarmingUp(false)
    })

    return () => {
      cancelled = true
    }
  }, [pathsKey])

  return { isWarmingUp, hasTimedOut }
}
