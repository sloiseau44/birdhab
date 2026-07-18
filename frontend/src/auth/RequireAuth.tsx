import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useServicesWarmup } from '../lib/useServicesWarmup'

// Un chemin par microservice métier (hors gateway/auth, déjà réveillé à la connexion —
// voir useBackendWarmup) : chacun s'endort et se réveille indépendamment sur Render.
const WARMUP_PATHS = ['/properties', '/tenants', '/leases', '/payments', '/documents']

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  // Appelé inconditionnellement (règle des hooks) : le ping part dès le montage, en
  // parallèle de la vérification d'authentification ci-dessous, pas après.
  const { isWarmingUp } = useServicesWarmup(WARMUP_PATHS)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500" role="status">
        Chargement…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (isWarmingUp) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500" role="status">
        Réveil des services…
      </div>
    )
  }

  return <>{children}</>
}
