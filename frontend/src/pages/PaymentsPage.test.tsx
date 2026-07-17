import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithAuth } from '../test/utils'
import { tokenStorage } from '../api/client'
import { PaymentsPage } from './PaymentsPage'

const PROPERTY = {
  id: 'p1',
  address: { street: '12 rue des Lilas', postalCode: '75011', city: 'Paris' },
  type: 'LOGEMENT' as const,
  surface: 42,
  referenceRent: 900,
}
const TENANT = { id: 't1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }
const LEASE = {
  id: 'l1',
  propertyId: 'p1',
  tenantId: 't1',
  startDate: '2026-01-01',
  rentAmount: 900,
  depositAmount: 900,
  status: 'ACTIVE' as const,
}
const PAID_PAYMENT = {
  id: 'pay1',
  leaseId: 'l1',
  dueDate: '2026-02-01',
  amount: 900,
  status: 'PAID' as const,
  paidDate: '2026-02-01',
  paidAmount: 900,
}
const OWNER_WITH_ADDRESS = {
  id: 'u1',
  email: 'owner@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  address: { street: '1 rue du Bailleur', postalCode: '75001', city: 'Paris' },
}
const OWNER_WITHOUT_ADDRESS = { id: 'u1', email: 'owner@example.com', firstName: 'Ada', lastName: 'Lovelace' }

function commonHandlers(payments: unknown[]) {
  return [
    http.get('/api/payments', () => HttpResponse.json(payments)),
    http.get('/api/leases', () => HttpResponse.json([LEASE])),
    http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
    http.get('/api/tenants', () => HttpResponse.json([TENANT])),
  ]
}

describe('PaymentsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    // AuthProvider ne charge /auth/me que si un access token est déjà présent.
    tokenStorage.setTokens({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 3600 })
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  it("désactive l'ajout et affiche un message s'il n'y a aucun bail", async () => {
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(OWNER_WITH_ADDRESS)),
      http.get('/api/payments', () => HttpResponse.json([])),
      http.get('/api/leases', () => HttpResponse.json([])),
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([])),
    )

    renderWithAuth(<PaymentsPage />)

    await waitFor(() =>
      expect(
        screen.getByText('Il faut au moins un bail enregistré pour créer une échéance.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Ajouter une échéance')).toBeDisabled()
  })

  it('résout le libellé du bail (bien + locataire) et affiche le statut', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json(OWNER_WITH_ADDRESS)), ...commonHandlers([PAID_PAYMENT]))

    renderWithAuth(<PaymentsPage />)

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument())
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
    expect(screen.getByText('Payé')).toBeInTheDocument()
  })

  it('crée une échéance via le formulaire puis rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let created = false
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(OWNER_WITH_ADDRESS)),
      http.get('/api/payments', () => HttpResponse.json(created ? [PAID_PAYMENT] : [])),
      http.get('/api/leases', () => HttpResponse.json([LEASE])),
      http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.post('/api/payments', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({ leaseId: 'l1', dueDate: '2026-02-01', amount: 900 })
        created = true
        return HttpResponse.json(PAID_PAYMENT, { status: 201 })
      }),
    )

    renderWithAuth(<PaymentsPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucune échéance enregistrée pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter une échéance'))
    await user.selectOptions(screen.getByLabelText('Bail'), 'l1')
    await user.type(screen.getByLabelText("Date d'échéance"), '2026-02-01')
    await user.type(screen.getByLabelText('Montant attendu (€)'), '900')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument())
  })

  it('génère une quittance pour un paiement payé et déclenche le téléchargement', async () => {
    const user = userEvent.setup()
    let capturedDownloadName: string | undefined
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedDownloadName = this.download
    })
    server.use(
      http.get('/api/auth/me', () => HttpResponse.json(OWNER_WITH_ADDRESS)),
      ...commonHandlers([PAID_PAYMENT]),
      http.post('/api/payments/pay1/receipt', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          ownerFullName: 'Ada Lovelace',
          ownerAddress: OWNER_WITH_ADDRESS.address,
          tenantFullName: 'Jean Dupont',
          propertyAddress: PROPERTY.address,
        })
        return new HttpResponse(new Blob(['%PDF-1.4']), {
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )

    renderWithAuth(<PaymentsPage />)
    await waitFor(() => expect(screen.getByText('Quittance')).toBeInTheDocument())

    await user.click(screen.getByText('Quittance'))

    await waitFor(() => expect(capturedDownloadName).toBe('quittance-2026-02-01.pdf'))
  })

  it("bloque la génération de quittance et affiche un message si l'adresse du propriétaire est manquante", async () => {
    const user = userEvent.setup()
    server.use(http.get('/api/auth/me', () => HttpResponse.json(OWNER_WITHOUT_ADDRESS)), ...commonHandlers([PAID_PAYMENT]))

    renderWithAuth(<PaymentsPage />)
    await waitFor(() => expect(screen.getByText('Quittance')).toBeInTheDocument())

    await user.click(screen.getByText('Quittance'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        "Renseigne d'abord ton adresse dans « Mon profil » pour générer une quittance.",
      ),
    )
  })
})
