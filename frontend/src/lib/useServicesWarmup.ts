import { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { isServiceUnavailable } from './errors'

const RETRY_DELAY_MS = 4000
const MAX_WARMUP_MS = 60000

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
 * MAX_WARMUP_MS dans tous les cas pour ne jamais bloquer indéfiniment.
 */
export function useServicesWarmup(paths: string[]) {
  const [isWarmingUp, setIsWarmingUp] = useState(true)
  const pathsKey = paths.join(',')

  useEffect(() => {
    let cancelled = false
    const deadline = Date.now() + MAX_WARMUP_MS

    async function pingUntilReady(path: string): Promise<void> {
      for (;;) {
        try {
          await apiClient.get(path)
          return
        } catch (err) {
          if (cancelled) return
          if (!isServiceUnavailable(err) || Date.now() >= deadline) return
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }
      }
    }

    Promise.all(pathsKey.split(',').filter(Boolean).map(pingUntilReady)).then(() => {
      if (!cancelled) setIsWarmingUp(false)
    })

    return () => {
      cancelled = true
    }
  }, [pathsKey])

  return { isWarmingUp }
}
