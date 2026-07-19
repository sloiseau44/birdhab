import { apiClient } from '../api/client'
import { useWarmup } from './useWarmup'

/**
 * Filet de sécurité post-connexion (voir `RequireAuth.tsx`) : dans le flux normal,
 * Login/RegisterPage a déjà réveillé tous les services via `useBackendWarmup` avant même
 * de permettre la connexion, donc ce hook devrait résoudre quasi instantanément la plupart
 * du temps. Il reste nécessaire pour les cas où l'app est atteinte sans repasser par la
 * page de connexion (session encore valide, navigation directe vers une URL protégée).
 * Utilise `apiClient` (pas l'axios brut de `useBackendWarmup`) : on est déjà authentifié
 * ici, donc un 401 mérite la logique normale de refresh de l'intercepteur.
 */
export function useServicesWarmup(paths: string[]) {
  return useWarmup(paths, apiClient)
}
