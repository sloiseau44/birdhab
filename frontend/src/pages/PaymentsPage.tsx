import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as paymentsApi from '../api/payments'
import * as leasesApi from '../api/leases'
import * as propertiesApi from '../api/properties'
import * as tenantsApi from '../api/tenants'
import type { Payment, PaymentRequest, PaymentStatus } from '../api/payments'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  LATE: 'En retard',
}

const STATUS_CLASSES: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  LATE: 'bg-red-50 text-red-700',
}

const EMPTY_FORM = {
  leaseId: '',
  dueDate: '',
  amount: '',
  isPaid: false,
  paidDate: '',
  paidAmount: '',
}

type FormState = typeof EMPTY_FORM

function toRequest(form: FormState): PaymentRequest {
  return {
    leaseId: form.leaseId,
    dueDate: form.dueDate,
    amount: Number(form.amount),
    paidDate: form.isPaid ? form.paidDate : undefined,
    paidAmount: form.isPaid ? Number(form.paidAmount) : undefined,
  }
}

function toForm(payment: Payment): FormState {
  return {
    leaseId: payment.leaseId ?? '',
    dueDate: payment.dueDate ?? '',
    amount: String(payment.amount ?? ''),
    isPaid: payment.paidDate != null,
    paidDate: payment.paidDate ?? '',
    paidAmount: payment.paidAmount != null ? String(payment.paidAmount) : '',
  }
}

export function PaymentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.listPayments,
  })
  const { data: leases } = useQuery({ queryKey: ['leases'], queryFn: leasesApi.listLeases })
  const { data: properties } = useQuery({ queryKey: ['properties'], queryFn: propertiesApi.listProperties })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.listTenants })

  const propertyById = useMemo(() => new Map(properties?.map((p) => [p.id, p])), [properties])
  const tenantById = useMemo(() => new Map(tenants?.map((t) => [t.id, t])), [tenants])
  const leaseById = useMemo(() => new Map(leases?.map((l) => [l.id, l])), [leases])

  function leaseLabel(leaseId: string | undefined) {
    const lease = leaseId ? leaseById.get(leaseId) : undefined
    if (!lease) return '—'
    const property = propertyById.get(lease.propertyId)
    const tenant = tenantById.get(lease.tenantId)
    return `${property?.address?.street ?? '?'} — ${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [generatingReceiptId, setGeneratingReceiptId] = useState<string | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payments'] })

  const createMutation = useMutation({
    mutationFn: (request: PaymentRequest) => paymentsApi.createPayment(request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: PaymentRequest }) =>
      paymentsApi.updatePayment(id, request),
    onSuccess: () => {
      invalidate()
      closeForm()
    },
    onError: (err) => setFormError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.deletePayment(id),
    onSuccess: invalidate,
  })

  function openCreateForm() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setEditingId(null)
    setIsCreating(true)
  }

  function openEditForm(payment: Payment) {
    setForm(toForm(payment))
    setFormError(null)
    setEditingId(payment.id ?? null)
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

  async function handleGenerateReceipt(payment: Payment) {
    setReceiptError(null)
    const lease = payment.leaseId ? leaseById.get(payment.leaseId) : undefined
    const property = lease ? propertyById.get(lease.propertyId) : undefined
    const tenant = lease ? tenantById.get(lease.tenantId) : undefined

    if (!user?.address) {
      setReceiptError("Renseigne d'abord ton adresse dans « Mon profil » pour générer une quittance.")
      return
    }
    if (!lease || !property?.address || !tenant) {
      setReceiptError('Impossible de retrouver le bien ou le locataire associés à ce bail.')
      return
    }
    if (!payment.id) return

    setGeneratingReceiptId(payment.id)
    try {
      const blob = await paymentsApi.generateReceipt(payment.id, {
        ownerFullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        ownerAddress: user.address,
        tenantFullName: `${tenant.firstName} ${tenant.lastName}`,
        propertyAddress: property.address,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quittance-${payment.dueDate}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setReceiptError(extractErrorMessage(err, 'Échec de la génération de la quittance'))
    } finally {
      setGeneratingReceiptId(null)
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending
  const noLeases = (leases?.length ?? 0) === 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Paiements</h1>
        {!isCreating && (
          <Button onClick={openCreateForm} disabled={noLeases}>
            Ajouter une échéance
          </Button>
        )}
      </div>
      {noLeases && !isCreating && (
        <p className="mt-2 text-sm text-slate-500">
          Il faut au moins un bail enregistré pour créer une échéance.
        </p>
      )}
      {receiptError && <div className="mt-4"><ErrorBanner message={receiptError} /></div>}

      {isCreating && (
        <Card className="mt-6 p-6">
          <h2 className="text-lg font-medium text-slate-900">
            {editingId ? "Modifier l'échéance" : 'Nouvelle échéance'}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {formError && <ErrorBanner message={formError} />}
            <div className="flex flex-col gap-1">
              <label htmlFor="leaseId" className="text-sm font-medium text-slate-700">
                Bail
              </label>
              <select
                id="leaseId"
                required
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={form.leaseId}
                onChange={(e) => setForm({ ...form, leaseId: e.target.value })}
              >
                <option value="" disabled>
                  Sélectionner un bail
                </option>
                {leases?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {leaseLabel(l.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date d'échéance"
                name="dueDate"
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
              <Input
                label="Montant attendu (€)"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
              />
              Paiement déjà reçu
            </label>
            {form.isPaid && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date de paiement"
                  name="paidDate"
                  type="date"
                  required
                  value={form.paidDate}
                  onChange={(e) => setForm({ ...form, paidDate: e.target.value })}
                />
                <Input
                  label="Montant reçu (€)"
                  name="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                />
              </div>
            )}
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
        {isLoading && <p className="p-6 text-sm text-slate-500">Chargement…</p>}
        {error && <div className="p-6"><ErrorBanner message={extractErrorMessage(error)} /></div>}
        {payments && payments.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucune échéance enregistrée pour l'instant.</p>
        )}
        {payments && payments.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Bail</th>
                <th className="px-6 py-3 font-medium">Échéance</th>
                <th className="px-6 py-3 font-medium">Montant</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-3 text-slate-900">{leaseLabel(payment.leaseId)}</td>
                  <td className="px-6 py-3 text-slate-600">{payment.dueDate}</td>
                  <td className="px-6 py-3 text-slate-600">{payment.amount} €</td>
                  <td className="px-6 py-3">
                    {payment.status && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[payment.status]}`}
                      >
                        {STATUS_LABELS[payment.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    {payment.status === 'PAID' && (
                      <button
                        onClick={() => handleGenerateReceipt(payment)}
                        disabled={generatingReceiptId === payment.id}
                        className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                      >
                        {generatingReceiptId === payment.id ? 'Génération…' : 'Quittance'}
                      </button>
                    )}
                    <button
                      onClick={() => openEditForm(payment)}
                      className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => payment.id && deleteMutation.mutate(payment.id)}
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
