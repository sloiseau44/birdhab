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
