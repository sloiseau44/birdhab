import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as tenantsApi from '../api/tenants'
import type { Tenant, TenantRequest } from '../api/tenants'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  postalCode: '',
  city: '',
}

type FormState = typeof EMPTY_FORM

function toRequest(form: FormState): TenantRequest {
  const hasAddress = form.street || form.postalCode || form.city
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone || undefined,
    address: hasAddress
      ? { street: form.street, postalCode: form.postalCode, city: form.city }
      : undefined,
  }
}

function toForm(tenant: Tenant): FormState {
  return {
    firstName: tenant.firstName ?? '',
    lastName: tenant.lastName ?? '',
    email: tenant.email ?? '',
    phone: tenant.phone ?? '',
    street: tenant.address?.street ?? '',
    postalCode: tenant.address?.postalCode ?? '',
    city: tenant.address?.city ?? '',
  }
}

export function TenantsPage() {
  const queryClient = useQueryClient()
  const { data: tenants, isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.listTenants,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tenants'] })

  const createMutation = useMutation({
    mutationFn: (request: TenantRequest) => tenantsApi.createTenant(request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: TenantRequest }) =>
      tenantsApi.updateTenant(id, request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.deleteTenant(id),
    onSuccess: () => {
      setDeleteError(null)
      invalidate()
    },
    onError: (err) => setDeleteError(extractErrorMessage(err, 'Échec de la suppression')),
  })

  function openCreateForm() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId(null)
    setIsCreating(true)
  }

  function openEditForm(tenant: Tenant) {
    setForm(toForm(tenant))
    setFormError(null)
    setEditingId(tenant.id ?? null)
    setIsCreating(true)
  }

  function closeForm() {
    setIsCreating(false)
    setEditingId(null)
    setFormError(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const request = toRequest(form)
    if (editingId) {
      updateMutation.mutate({ id: editingId, request })
    } else {
      createMutation.mutate(request)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Locataires</h1>
        {!isCreating && <Button onClick={openCreateForm}>Ajouter un locataire</Button>}
      </div>

      {isCreating && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-medium text-slate-900">
            {editingId ? 'Modifier le locataire' : 'Nouveau locataire'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Prénom"
                name="firstName"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                label="Nom"
                name="lastName"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Email"
                type="email"
                name="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Téléphone"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <Input
              label="Adresse (facultatif)"
              name="street"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Code postal"
                name="postalCode"
                pattern="[0-9]{5}"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
              <Input
                label="Ville"
                name="city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="mt-2 flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="secondary" onClick={closeForm}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        {deleteError && <div className="p-6 pb-0"><ErrorBanner message={deleteError} /></div>}
        {isLoading && <p className="p-6 text-sm text-slate-500" role="status">Chargement…</p>}
        {error && <div className="p-6"><ErrorBanner message={extractErrorMessage(error)} /></div>}
        {tenants && tenants.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucun locataire enregistré pour l'instant.</p>
        )}
        {tenants && tenants.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Nom</th>
                <th scope="col" className="px-6 py-3 font-medium">Email</th>
                <th scope="col" className="px-6 py-3 font-medium">Téléphone</th>
                <th scope="col" className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-6 py-3 text-slate-900">
                    {tenant.firstName} {tenant.lastName}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{tenant.email}</td>
                  <td className="px-6 py-3 text-slate-600">{tenant.phone || '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openEditForm(tenant)}
                      className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => tenant.id && deleteMutation.mutate(tenant.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
