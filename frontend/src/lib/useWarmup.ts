import { useEffect, useState } from 'react'
import { isServiceUnavailable } from './errors'

// Un intervalle de 4s (retenté sur 5-6 chemins en parallèle) s'est révélé contre-productif
// en usage réel : une seule visite directe d'un service endormi le réveillait de façon
// fiable, mais nos tentatives automatiques répétées ne finissaient jamais par aboutir,
// même après plusieurs minutes. Hypothèse la plus probable : ce rythme entretient la
// protection anti-abus de Render (429 "hibernate-rate-limited") en continu au lieu de le
// laisser se dissiper le temps que le service termine son démarrage. Un intervalle plus
// espacé laisse le réveil se dérouler sans concurrence de notre propre boucle de retry.
const RETRY_DELAY_MS = 15000
// Un service Spring Boot (JVM) cold-starte jusqu'à ~2-3 min sur le tier gratuit Render
// (observé en usage réel : "Started AuthServiceApplication in 119.901 seconds"), et une
// chaîne à plusieurs sauts (ex. Gateway -> auth) peut cumuler ces délais plutôt que les
// paralléliser — d'où un plafond généreux, commun à tous les usages de ce hook.
const MAX_WARMUP_MS = 180000

/**
 * Ping en parallèle chaque chemin donné, via le client HTTP fourni (axios brut pour un
 * réveil pré-connexion — voir useBackendWarmup — ou apiClient une fois authentifié — voir
 * useServicesWarmup), tant qu'il répond encore 429/502-504/erreur réseau
 * (`isServiceUnavailable`). "Prêt" dès que tous ont eu une vraie réponse applicative (401
 * inclus : la chaîne répond, ce n'est pas un problème de réveil), ou après MAX_WARMUP_MS
 * dans tous les cas pour ne jamais bloquer indéfiniment — `hasTimedOut` distingue ce
 * dernier cas pour que l'appelant affiche un message explicite plutôt qu'un silence.
 */
export function useWarmup(paths: string[], client: { get: (path: string) => Promise<unknown> }) {
  const [isWarmingUp, setIsWarmingUp] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const pathsKey = paths.join(',')

  useEffect(() => {
    let cancelled = false
    const deadline = Date.now() + MAX_WARMUP_MS

    async function pingUntilReady(path: string): Promise<boolean> {
      for (;;) {
        try {
          await client.get(path)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathsKey résume déjà le contenu de paths ; client est stable (import statique)
  }, [pathsKey])

  return { isWarmingUp, hasTimedOut }
}
