import axios from 'axios'
import { useWarmup } from './useWarmup'

// Un chemin par service Render gratuit (auth/gateway + les 5 métier) : chacun dort et se
// réveille indépendamment. Réveiller uniquement auth/gateway ici et les 5 autres seulement
// après connexion (voir useServicesWarmup/RequireAuth) créait un DEUXIÈME écran d'attente
// séparé juste après une connexion pourtant réussie — source de confusion réelle observée
// (page Locataires bloquée juste après le login). Dès la page de connexion, tout démarre
// en parallèle ; le bouton reste bloqué jusqu'à ce que TOUT soit prêt, pas seulement auth.
const WARMUP_PATHS = ['/api/auth/me', '/api/properties', '/api/tenants', '/api/leases', '/api/payments', '/api/documents']

/**
 * Réveil silencieux de tous les services dès le montage de Login/RegisterPage, en `axios`
 * brut (pas `apiClient` : on n'est pas encore authentifié, et passer par l'intercepteur
 * déclencherait sa logique de refresh sur les 401 attendus, masquant le vrai signal).
 * Bloque le bouton de connexion pendant ce temps plutôt que de laisser l'utilisateur
 * essuyer un 502/429 après avoir rempli le formulaire.
 */
export function useBackendWarmup() {
  return useWarmup(WARMUP_PATHS, axios)
}
