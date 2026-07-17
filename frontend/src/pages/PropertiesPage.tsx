import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as propertiesApi from '../api/properties'
import type { Property, PropertyRequest, PropertyType } from '../api/properties'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  LOGEMENT: 'Logement',
  PARKING: 'Parking',
  COMMERCE: 'Commerce',
}

const EMPTY_FORM = {
  street: '',
  postalCode: '',
  city: '',
  type: 'LOGEMENT' as PropertyType,
  surface: '',
  referenceRent: '',
}

type FormState = typeof EMPTY_FORM

function toRequest(form: FormState): PropertyRequest {
  return {
    address: { street: form.street, postalCode: form.postalCode, city: form.city },
    type: form.type,
    surface: Number(form.surface),
    referenceRent: Number(form.referenceRent),
  }
}

function toForm(property: Property): FormState {
  return {
    street: property.address?.street ?? '',
    postalCode: property.address?.postalCode ?? '',
    city: property.address?.city ?? '',
    type: property.type ?? 'LOGEMENT',
    surface: String(property.surface ?? ''),
    referenceRent: String(property.referenceRent ?? ''),
  }
}

export function PropertiesPage() {
  const queryClient = useQueryClient()
  const { data: properties, isLoading, error } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.listProperties,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['properties'] })

  const createMutation = useMutation({
    mutationFn: (request: PropertyRequest) => propertiesApi.createProperty(request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: PropertyRequest }) =>
      propertiesApi.updateProperty(id, request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => propertiesApi.deleteProperty(id),
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

  function openEditForm(property: Property) {
    setForm(toForm(property))
    setFormError(null)
    setEditingId(property.id ?? null)
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
        <h1 className="text-2xl font-semibold text-slate-900">Biens</h1>
        {!isCreating && <Button onClick={openCreateForm}>Ajouter un bien</Button>}
      </div>

      {isCreating && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-medium text-slate-900">
            {editingId ? 'Modifier le bien' : 'Nouveau bien'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <Input
              label="Adresse"
              name="street"
              required
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Code postal"
                name="postalCode"
                required
                pattern="[0-9]{5}"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              />
              <Input
                label="Ville"
                name="city"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-sm font-medium text-slate-700">
                Type
              </label>
              <select
                id="type"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as PropertyType })}
              >
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Surface (m²)"
                name="surface"
                type="number"
                step="0.1"
                min="0.1"
                required
                value={form.surface}
                onChange={(e) => setForm({ ...form, surface: e.target.value })}
              />
              <Input
                label="Loyer de référence (€)"
                name="referenceRent"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.referenceRent}
                onChange={(e) => setForm({ ...form, referenceRent: e.target.value })}
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
        {properties && properties.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucun bien enregistré pour l'instant.</p>
        )}
        {properties && properties.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Adresse</th>
                <th scope="col" className="px-6 py-3 font-medium">Type</th>
                <th scope="col" className="px-6 py-3 font-medium">Surface</th>
                <th scope="col" className="px-6 py-3 font-medium">Loyer de référence</th>
                <th scope="col" className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => (
                <tr key={property.id}>
                  <td className="px-6 py-3 text-slate-900">
                    {property.address?.street}, {property.address?.postalCode} {property.address?.city}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {property.type ? PROPERTY_TYPE_LABELS[property.type] : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{property.surface} m²</td>
                  <td className="px-6 py-3 text-slate-600">{property.referenceRent} €</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => openEditForm(property)}
                      className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => property.id && deleteMutation.mutate(property.id)}
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
