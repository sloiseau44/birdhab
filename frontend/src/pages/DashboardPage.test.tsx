import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithQueryClient } from '../test/utils'
import { DashboardPage } from './DashboardPage'

const PROPERTY = {
  id: 'p1',
  address: { street: '12 rue des Lilas', postalCode: '75011', city: 'Paris' },
  type: 'LOGEMENT' as const,
  surface: 42,
  referenceRent: 900,
}
const LEASE = {
  id: 'l1',
  propertyId: 'p1',
  tenantId: 't1',
  startDate: '2026-01-01',
  rentAmount: 900,
  depositAmount: 900,
  status: 'ACTIVE' as const,
}
const TENANT = { id: 't1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }
const PAID_PAYMENT = { id: 'pay1', leaseId: 'l1', dueDate: '2026-01-01', amount: 900, status: 'PAID' as const, paidAmount: 900 }

function baseHandlers() {
  return [
    http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
    http.get('/api/leases', () => HttpResponse.json([LEASE])),
    http.get('/api/tenants', () => HttpResponse.json([TENANT])),
  ]
}

describe('DashboardPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('expose les jauges de progression via role="progressbar" avec un libellé et une valeur accessibles', async () => {
    server.use(...baseHandlers(), http.get('/api/payments', () => HttpResponse.json([PAID_PAYMENT])))

    renderWithQueryClient(<DashboardPage />)

    await waitFor(() => expect(screen.getAllByRole('progressbar')).toHaveLength(2))
    const rentMeter = screen.getByRole('progressbar', { name: 'Loyers perçus / attendus' })
    expect(rentMeter).toHaveAttribute('aria-valuenow', '100')
    expect(rentMeter).toHaveAttribute('aria-valuemin', '0')
    expect(rentMeter).toHaveAttribute('aria-valuemax', '100')

    const occupancyMeter = screen.getByRole('progressbar', { name: 'Biens occupés' })
    expect(occupancyMeter).toHaveAttribute('aria-valuenow', '100')
  })

  it('affiche 0/total et une jauge à 0% quand il n\'y a aucun paiement (pas de division par zéro)', async () => {
    server.use(...baseHandlers(), http.get('/api/payments', () => HttpResponse.json([])))

    renderWithQueryClient(<DashboardPage />)

    await waitFor(() => expect(screen.getAllByRole('progressbar')).toHaveLength(2))
    const rentMeter = screen.getByRole('progressbar', { name: 'Loyers perçus / attendus' })
    expect(rentMeter).toHaveAttribute('aria-valuenow', '0')
  })
})
