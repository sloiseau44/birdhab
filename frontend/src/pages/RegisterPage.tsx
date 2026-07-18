import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage, isRateLimited } from '../lib/errors'
import { useCooldown } from '../lib/useCooldown'
import { useBackendWarmup } from '../lib/useBackendWarmup'

const WAKE_UP_COOLDOWN_SECONDS = 60

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { secondsLeft, start } = useCooldown()
  const { isWarmingUp } = useBackendWarmup()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await register(email, password, firstName || undefined, lastName || undefined)
      navigate('/', { replace: true })
    } catch (err) {
      if (isRateLimited(err)) {
        start(WAKE_UP_COOLDOWN_SECONDS)
      } else {
        setError(extractErrorMessage(err, "Impossible de créer le compte"))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-slate-900">Créer un compte propriétaire</h1>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {error && <ErrorBanner message={error} />}
          {secondsLeft > 0 && (
            <ErrorBanner
              message={`Le serveur se réveille après une période d'inactivité (offre gratuite) — réessaie dans ${secondsLeft}s.`}
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" name="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Nom" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
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
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={isSubmitting || secondsLeft > 0 || isWarmingUp} className="mt-2">
            {isSubmitting
              ? 'Création…'
              : secondsLeft > 0
                ? `Réessaie dans ${secondsLeft}s`
                : isWarmingUp
                  ? 'Préparation du service…'
                  : 'Créer mon compte'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            Se connecter
          </Link>
        </p>
      </Card>
    </div>
  )
}
