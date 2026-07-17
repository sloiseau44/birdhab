import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/useAuth'
import * as authApi from '../api/auth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [street, setStreet] = useState(user?.address?.street ?? '')
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode ?? '')
  const [city, setCity] = useState(user?.address?.city ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)
    try {
      await authApi.updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        address: street && postalCode && city ? { street, postalCode, city } : undefined,
      })
      await refreshUser()
      setSuccess(true)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mon profil</h1>
      <p className="mt-1 text-sm text-slate-500">
        L'adresse renseignée ici est utilisée comme adresse du bailleur lors de la
        génération d'une quittance (module Paiements).
      </p>

      <Card className="mt-6 max-w-xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <ErrorBanner message={error} />}
          {success && (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              Profil mis à jour.
            </div>
          )}
          <Input label="Email" value={user?.email ?? ''} disabled />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Prénom"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Nom"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <Input
            label="Adresse"
            name="street"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Code postal"
              name="postalCode"
              pattern="[0-9]{5}"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
            />
            <Input
              label="Ville"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isSaving} className="mt-2 self-start">
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
