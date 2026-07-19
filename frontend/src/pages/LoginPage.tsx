import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage, isRateLimited } from '../lib/errors'
import { useCooldown } from '../lib/useCooldown'
import { useBackendWarmup } from '../lib/useBackendWarmup'

const WAKE_UP_COOLDOWN_SECONDS = 60

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { secondsLeft, start } = useCooldown()
  const { isWarmingUp, hasTimedOut } = useBackendWarmup()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: Location })?.from?.pathname ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      if (isRateLimited(err)) {
        start(WAKE_UP_COOLDOWN_SECONDS)
      } else {
        setError(extractErrorMessage(err, 'Email ou mot de passe incorrect'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-slate-900">Connexion à Birdhab</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && <ErrorBanner message={error} />}
          {secondsLeft > 0 && (
            <ErrorBanner
              message={`Le serveur se réveille après une période d'inactivité (offre gratuite) — réessaie dans ${secondsLeft}s.`}
            />
          )}
          {hasTimedOut && secondsLeft === 0 && (
            <ErrorBanner message="Le serveur met plus de temps que prévu à démarrer (offre gratuite). Tu peux réessayer maintenant." />
          )}
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Mot de passe"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting || secondsLeft > 0 || isWarmingUp} className="mt-2">
            {isSubmitting
              ? 'Connexion…'
              : secondsLeft > 0
                ? `Réessaie dans ${secondsLeft}s`
                : isWarmingUp
                  ? 'Préparation du service…'
                  : 'Se connecter'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
            Créer un compte
          </Link>
        </p>
      </Card>
    </div>
  )
}
