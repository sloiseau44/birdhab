import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithQueryClient } from '../test/utils'
import { LeasesPage } from './LeasesPage'

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

function baseHandlers(leases: unknown[]) {
  return [
    http.get('/api/leases', () => HttpResponse.json(leases)),
    http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
    http.get('/api/tenants', () => HttpResponse.json([TENANT])),
  ]
}

describe('LeasesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("désactive le bouton d'ajout et affiche un message s'il n'y a ni bien ni locataire", async () => {
    server.use(
      http.get('/api/leases', () => HttpResponse.json([])),
      http.get('/api/properties', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([])),
    )

    renderWithQueryClient(<LeasesPage />)

    await waitFor(() =>
      expect(
        screen.getByText('Il faut au moins un bien et un locataire enregistrés pour créer un bail.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Ajouter un bail')).toBeDisabled()
  })

  it('résout le bien et le locataire du bail en libellés lisibles, pas en UUID brut', async () => {
    server.use(...baseHandlers([LEASE]))

    renderWithQueryClient(<LeasesPage />)

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas, Paris/)).toBeInTheDocument())
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.queryByText('p1')).not.toBeInTheDocument()
    expect(screen.queryByText('t1')).not.toBeInTheDocument()
  })

  it('crée un bail via les listes déroulantes bien/locataire puis rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let created = false
    server.use(
      http.get('/api/leases', () => HttpResponse.json(created ? [LEASE] : [])),
      http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.post('/api/leases', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          propertyId: 'p1',
          tenantId: 't1',
          startDate: '2026-01-01',
          rentAmount: 900,
          depositAmount: 900,
        })
        created = true
        return HttpResponse.json(LEASE, { status: 201 })
      }),
    )

    renderWithQueryClient(<LeasesPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucun bail enregistré pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter un bail'))
    await user.selectOptions(screen.getByLabelText('Bien'), 'p1')
    await user.selectOptions(screen.getByLabelText('Locataire'), 't1')
    await user.type(screen.getByLabelText('Date de début'), '2026-01-01')
    await user.type(screen.getByLabelText('Loyer mensuel (€)'), '900')
    await user.type(screen.getByLabelText('Dépôt de garantie (€)'), '900')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas, Paris/)).toBeInTheDocument())
  })

  it('supprime un bail et rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get('/api/leases', () => HttpResponse.json(deleted ? [] : [LEASE])),
      http.get('/api/properties', () => HttpResponse.json([PROPERTY])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.delete('/api/leases/l1', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithQueryClient(<LeasesPage />)
    await waitFor(() => expect(screen.getByText(/12 rue des Lilas, Paris/)).toBeInTheDocument())

    const row = screen.getByText(/12 rue des Lilas, Paris/).closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() =>
      expect(screen.getByText("Aucun bail enregistré pour l'instant.")).toBeInTheDocument(),
    )
  })

  it('affiche le message serveur si la suppression échoue et garde le bail dans la liste', async () => {
    const user = userEvent.setup()
    server.use(
      ...baseHandlers([LEASE]),
      http.delete('/api/leases/l1', () =>
        HttpResponse.json({ message: 'Bail encore lié à des paiements' }, { status: 409 }),
      ),
    )

    renderWithQueryClient(<LeasesPage />)
    await waitFor(() => expect(screen.getByText(/12 rue des Lilas, Paris/)).toBeInTheDocument())

    const row = screen.getByText(/12 rue des Lilas, Paris/).closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Bail encore lié à des paiements'),
    )
    expect(screen.getByText(/12 rue des Lilas, Paris/)).toBeInTheDocument()
  })
})
