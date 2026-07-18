/**
 * Extrait un message d'erreur lisible depuis une erreur Axios (voir
 * ErrorResponse dans les contrats OpenAPI de chaque service), avec un
 * message générique de repli.
 */
export function extractErrorMessage(error: unknown, fallback = 'Une erreur est survenue'): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message
  }
  return fallback
}

/**
 * Variante pour les requêtes `responseType: 'blob'` (téléchargement de document,
 * génération de quittance) : sur une erreur, Axios respecte quand même le
 * responseType demandé, donc `error.response.data` est un Blob plutôt que le JSON
 * ErrorResponse attendu — extractErrorMessage ne peut jamais le lire. On relit le
 * Blob en texte et on le parse nous-mêmes avant de retomber sur le message générique.
 */
export async function extractBlobErrorMessage(
  error: unknown,
  fallback = 'Une erreur est survenue',
): Promise<string> {
  const data = (error as { response?: { data?: unknown } } | null)?.response?.data
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text())
      if (typeof parsed?.message === 'string') return parsed.message
    } catch {
      // Corps non-JSON (ou vide) : on retombe sur le message générique ci-dessous.
    }
  }
  return extractErrorMessage(error, fallback)
}

/**
 * 429 renvoyé par la couche edge de Render pendant qu'un service gratuit se réveille
 * après une période d'inactivité (voir décision « Render » dans CLAUDE.md) — jamais un
 * 429 applicatif, l'appli n'a aucune autre logique de rate-limit. Sert à distinguer ce
 * cas d'une vraie erreur de formulaire, pour proposer un délai plutôt qu'un message
 * d'échec qui inciterait à recliquer et prolonger le blocage.
 */
export function isRateLimited(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 429
  )
}
