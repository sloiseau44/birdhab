import { useEffect, useState } from 'react'
import { isServiceUnavailable } from './errors'

// Observé en usage réel : Render a répondu 502 (sa propre page d'erreur, pas un silence)
// en quelques secondes à plusieurs reprises — la connexion n'est donc pas tenue ouverte
// jusqu'à la fin du démarrage. Une seule visite manuelle directe réveillait pourtant le
// service de façon fiable en 1-2 min, alors que nos tentatives automatiques répétées
// (retenter toutes les 4s puis 15s) n'aboutissaient jamais, même après plusieurs minutes,
// malgré une Gateway confirmée saine et des URLs de service correctes. Hypothèse retenue :
// des requêtes automatisées répétées ressemblent à du trafic abusif pour la protection
// anti-abus de Render et prolongent le blocage, contrairement à une requête isolée. Une
// seule requête par chemin, avec un délai d'attente généreux plutôt qu'une boucle de
// retry, reproduit le comportement qui a fonctionné manuellement.
const MAX_WARMUP_MS = 180000

/**
 * Une requête par chemin donné, via le client HTTP fourni (axios brut pour un réveil
 * pré-connexion — voir useBackendWarmup — ou apiClient une fois authentifié — voir
 * useServicesWarmup), avec MAX_WARMUP_MS comme délai d'attente. "Prêt" dès qu'une réponse
 * applicative arrive (401 inclus : la chaîne répond, ce n'est pas un problème de réveil) ;
 * `hasTimedOut` distingue le cas où la requête échoue encore pour cause d'indisponibilité
 * du service (`isServiceUnavailable`) — timeout compris — pour que l'appelant affiche un
 * message explicite plutôt qu'un silence.
 */
export function useWarmup(
  paths: string[],
  client: { get: (path: string, config?: { timeout?: number }) => Promise<unknown> },
) {
  const [isWarmingUp, setIsWarmingUp] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const pathsKey = paths.join(',')

  useEffect(() => {
    let cancelled = false

    async function pingOnce(path: string): Promise<boolean> {
      try {
        await client.get(path, { timeout: MAX_WARMUP_MS })
        return true
      } catch (err) {
        if (cancelled) return true
        return !isServiceUnavailable(err)
      }
    }

    Promise.all(pathsKey.split(',').filter(Boolean).map(pingOnce)).then((results) => {
      if (cancelled) return
      setHasTimedOut(results.some((ready) => !ready))
      setIsWarmingUp(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathsKey résume déjà le contenu de paths ; client est stable (import statique)
  }, [pathsKey])

  return { isWarmingUp, hasTimedOut }
}
