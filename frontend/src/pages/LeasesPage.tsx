import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as leasesApi from '../api/leases'
import * as propertiesApi from '../api/properties'
import * as tenantsApi from '../api/tenants'
import type { Lease, LeaseRequest, LeaseStatus } from '../api/leases'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

const STATUS_LABELS: Record<LeaseStatus, string> = {
  ACTIVE: 'En cours',
  TERMINATED: 'Terminé',
}

const STATUS_CLASSES: Record<LeaseStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  TERMINATED: 'bg-slate-100 text-slate-600',
}

const EMPTY_FORM = {
  propertyId: '',
  tenantId: '',
  startDate: '',
  endDate: '',
  rentAmount: '',
  depositAmount: '',
  irlReferenceQuarter: '',
}

type FormState = typeof EMPTY_FORM

function toRequest(form: FormState): LeaseRequest {
  return {
    propertyId: form.propertyId,
    tenantId: form.tenantId,
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    rentAmount: Number(form.rentAmount),
    depositAmount: Number(form.depositAmount),
    irlReferenceQuarter: form.irlReferenceQuarter || undefined,
  }
}

function toForm(lease: Lease): FormState {
  return {
    propertyId: lease.propertyId ?? '',
    tenantId: lease.tenantId ?? '',
    startDate: lease.startDate ?? '',
    endDate: lease.endDate ?? '',
    rentAmount: String(lease.rentAmount ?? ''),
    depositAmount: String(lease.depositAmount ?? ''),
    irlReferenceQuarter: lease.irlReferenceQuarter ?? '',
  }
}

export function LeasesPage() {
  const queryClient = useQueryClient()
  const { data: leases, isLoading, error } = useQuery({
    queryKey: ['leases'],
    queryFn: leasesApi.listLeases,
  })
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.listProperties,
  })
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.listTenants,
  })

  const propertyLabels = useMemo(() => {
    const map = new Map<string, string>()
    properties?.forEach((p) => {
      if (p.id) map.set(p.id, `${p.address?.street}, ${p.address?.city}`)
    })
    return map
  }, [properties])

  const tenantLabels = useMemo(() => {
    const map = new Map<string, string>()
    tenants?.forEach((t) => {
      if (t.id) map.set(t.id, `${t.firstName} ${t.lastName}`)
    })
    return map
  }, [tenants])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leases'] })

  const createMutation = useMutation({
    mutationFn: (request: LeaseRequest) => leasesApi.createLease(request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: LeaseRequest }) =>
      leasesApi.updateLease(id, request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leasesApi.deleteLease(id),
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

  function openEditForm(lease: Lease) {
    setForm(toForm(lease))
    setFormError(null)
    setEditingId(lease.id ?? null)
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
  const noPropertiesOrTenants = (properties?.length ?? 0) === 0 || (tenants?.length ?? 0) === 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Baux</h1>
        {!isCreating && (
          <Button onClick={openCreateForm} disabled={noPropertiesOrTenants}>
            Ajouter un bail
          </Button>
        )}
      </div>
      {noPropertiesOrTenants && !isCreating && (
        <p className="mt-2 text-sm text-slate-500">
          Il faut au moins un bien et un locataire enregistrés pour créer un bail.
        </p>
      )}

      {isCreating && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-medium text-slate-900">
            {editingId ? 'Modifier le bail' : 'Nouveau bail'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="propertyId" className="text-sm font-medium text-slate-700">
                  Bien
                </label>
                <select
                  id="propertyId"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                >
                  <option value="" disabled>
                    Sélectionner un bien
                  </option>
                  {properties?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address?.street}, {p.address?.city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="tenantId" className="text-sm font-medium text-slate-700">
                  Locataire
                </label>
                <select
                  id="tenantId"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                >
                  <option value="" disabled>
                    Sélectionner un locataire
                  </option>
                  {tenants?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date de début"
                name="startDate"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              <Input
                label="Date de fin (facultatif)"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Loyer mensuel (€)"
                name="rentAmount"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.rentAmount}
                onChange={(e) => setForm({ ...form, rentAmount: e.target.value })}
              />
              <Input
                label="Dépôt de garantie (€)"
                name="depositAmount"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.depositAmount}
                onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
              />
            </div>
            <Input
              label="Trimestre IRL de référence (facultatif, ex. 2026-T1)"
              name="irlReferenceQuarter"
              pattern="[0-9]{4}-T[1-4]"
              placeholder="2026-T1"
              value={form.irlReferenceQuarter}
              onChange={(e) => setForm({ ...form, irlReferenceQuarter: e.target.value })}
            />
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
        {isLoading && <p className="p-6 text-sm text-slate-500">Chargement…</p>}
        {error && <div className="p-6"><ErrorBanner message={extractErrorMessage(error)} /></div>}
        {leases && leases.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucun bail enregistré pour l'instant.</p>
        )}
        {leases && leases.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Bien</th>
                <th className="px-6 py-3 font-medium">Locataire</th>
                <th className="px-6 py-3 font-medium">Début</th>
                <th className="px-6 py-3 font-medium">Fin</th>
                <th className="px-6 py-3 font-medium">Loyer</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leases.map((lease) => (
                <tr key={lease.id}>
                  <td className="px-6 py-3 text-slate-900">
                    {lease.propertyId ? propertyLabels.get(lease.propertyId) ?? '—' : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {lease.tenantId ? tenantLabels.get(lease.tenantId) ?? '—' : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{lease.startDate}</td>
                  <td className="px-6 py-3 text-slate-600">{lease.endDate ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{lease.rentAmount} €</td>
                  <td className="px-6 py-3">
                    {lease.status && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[lease.status]}`}
                      >
                        {STATUS_LABELS[lease.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openEditForm(lease)}
                      className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => lease.id && deleteMutation.mutate(lease.id)}
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
