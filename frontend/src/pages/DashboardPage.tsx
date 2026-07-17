import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as propertiesApi from '../api/properties'
import * as leasesApi from '../api/leases'
import * as paymentsApi from '../api/payments'
import * as tenantsApi from '../api/tenants'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

function formatEuros(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    amount,
  )
}

function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
  return (
    <div
      className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
    </div>
  )
}

function StatTile({
  label,
  value,
  meter,
  tone = 'default',
}: {
  label: string
  value: string
  meter?: { value: number; total: number }
  tone?: 'default' | 'critical'
}) {
  return (
    <Card className="p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${tone === 'critical' ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </p>
      {meter && <Meter value={meter.value} total={meter.total} label={label} />}
    </Card>
  )
}

export function DashboardPage() {
  const { data: properties, isLoading: loadingProperties, error: propertiesError } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesApi.listProperties,
  })
  const { data: leases, isLoading: loadingLeases, error: leasesError } = useQuery({
    queryKey: ['leases'],
    queryFn: leasesApi.listLeases,
  })
  const { data: payments, isLoading: loadingPayments, error: paymentsError } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsApi.listPayments,
  })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.listTenants })

  const propertyById = useMemo(() => new Map(properties?.map((p) => [p.id, p])), [properties])
  const tenantById = useMemo(() => new Map(tenants?.map((t) => [t.id, t])), [tenants])
  const leaseById = useMemo(() => new Map(leases?.map((l) => [l.id, l])), [leases])

  const occupiedPropertyIds = useMemo(
    () => new Set(leases?.filter((l) => l.status === 'ACTIVE').map((l) => l.propertyId)),
    [leases],
  )
  const totalProperties = properties?.length ?? 0
  const occupiedCount = occupiedPropertyIds.size
  const vacantCount = Math.max(0, totalProperties - occupiedCount)

  const amountDue = useMemo(() => payments?.reduce((sum, p) => sum + (p.amount ?? 0), 0) ?? 0, [payments])
  const amountCollected = useMemo(
    () => payments?.reduce((sum, p) => sum + (p.paidAmount ?? 0), 0) ?? 0,
    [payments],
  )

  const latePayments = useMemo(() => payments?.filter((p) => p.status === 'LATE') ?? [], [payments])

  function leaseLabel(leaseId: string | undefined) {
    const lease = leaseId ? leaseById.get(leaseId) : undefined
    if (!lease) return '—'
    const property = propertyById.get(lease.propertyId)
    const tenant = tenantById.get(lease.tenantId)
    return `${property?.address?.street ?? '?'} — ${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`
  }

  function daysLate(dueDate: string | undefined): number {
    if (!dueDate) return 0
    const due = new Date(dueDate)
    const now = new Date()
    return Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const isLoading = loadingProperties || loadingLeases || loadingPayments
  const error = propertiesError ?? leasesError ?? paymentsError

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Tableau de bord</h1>

      {isLoading && <p className="mt-4 text-sm text-slate-500" role="status">Chargement…</p>}
      {error && <div className="mt-4"><ErrorBanner message={extractErrorMessage(error)} /></div>}

      {!isLoading && !error && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Loyers perçus / attendus"
              value={`${formatEuros(amountCollected)} / ${formatEuros(amountDue)}`}
              meter={{ value: amountCollected, total: amountDue }}
            />
            <StatTile
              label="Biens occupés"
              value={`${occupiedCount} / ${totalProperties}`}
              meter={{ value: occupiedCount, total: totalProperties }}
            />
            <StatTile
              label="Échéances en retard"
              value={String(latePayments.length)}
              tone={latePayments.length > 0 ? 'critical' : 'default'}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="text-sm font-medium text-slate-500">Occupation</p>
              <p className="mt-2 text-sm text-slate-600">
                {occupiedCount} occupé{occupiedCount > 1 ? 's' : ''}, {vacantCount} vacant
                {vacantCount > 1 ? 's' : ''} sur {totalProperties} bien{totalProperties > 1 ? 's' : ''}.
              </p>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-medium text-slate-900">Alertes de retard</h2>
            </div>
            {latePayments.length === 0 && (
              <p className="p-6 text-sm text-slate-500">Aucune échéance en retard. 🎉</p>
            )}
            {latePayments.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Bail</th>
                    <th scope="col" className="px-6 py-3 font-medium">Échéance</th>
                    <th scope="col" className="px-6 py-3 font-medium">Montant</th>
                    <th scope="col" className="px-6 py-3 font-medium">Retard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {latePayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-3 text-slate-900">{leaseLabel(payment.leaseId)}</td>
                      <td className="px-6 py-3 text-slate-600">{payment.dueDate}</td>
                      <td className="px-6 py-3 text-slate-600">{payment.amount} €</td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          {daysLate(payment.dueDate)} j
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
