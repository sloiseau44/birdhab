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
  const { isWarmingUp, hasTimedOut } = useServicesWarmup(WARMUP_PATHS)

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

  if (hasTimedOut) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 text-slate-500"
        role="alert"
      >
        <p>Le démarrage des services prend plus de temps que prévu.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return <>{children}</>
}
