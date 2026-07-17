import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithQueryClient } from '../test/utils'
import { TenantsPage } from './TenantsPage'

const TENANT = {
  id: 't1',
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean.dupont@example.com',
  phone: '0601020304',
}

describe('TenantsPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("affiche un message quand la liste est vide", async () => {
    server.use(http.get('/api/tenants', () => HttpResponse.json([])))

    renderWithQueryClient(<TenantsPage />)

    await waitFor(() =>
      expect(screen.getByText("Aucun locataire enregistré pour l'instant.")).toBeInTheDocument(),
    )
  })

  it('affiche les locataires retournés par l\'API', async () => {
    server.use(http.get('/api/tenants', () => HttpResponse.json([TENANT])))

    renderWithQueryClient(<TenantsPage />)

    await waitFor(() => expect(screen.getByText('Jean Dupont')).toBeInTheDocument())
    expect(screen.getByText('jean.dupont@example.com')).toBeInTheDocument()
    expect(screen.getByText('0601020304')).toBeInTheDocument()
  })

  it('crée un locataire sans adresse (facultative) et rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let created = false
    server.use(
      http.get('/api/tenants', () => HttpResponse.json(created ? [TENANT] : [])),
      http.post('/api/tenants', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@example.com',
          phone: '0601020304',
        })
        created = true
        return HttpResponse.json(TENANT, { status: 201 })
      }),
    )

    renderWithQueryClient(<TenantsPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucun locataire enregistré pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter un locataire'))
    await user.type(screen.getByLabelText('Prénom'), 'Jean')
    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.type(screen.getByLabelText('Email'), 'jean.dupont@example.com')
    await user.type(screen.getByLabelText('Téléphone'), '0601020304')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText('Jean Dupont')).toBeInTheDocument())
  })

  it('affiche le message serveur si la création échoue', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/tenants', () => HttpResponse.json([])),
      http.post('/api/tenants', () =>
        HttpResponse.json({ message: 'Email déjà utilisé' }, { status: 409 }),
      ),
    )

    renderWithQueryClient(<TenantsPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucun locataire enregistré pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter un locataire'))
    await user.type(screen.getByLabelText('Prénom'), 'Jean')
    await user.type(screen.getByLabelText('Nom'), 'Dupont')
    await user.type(screen.getByLabelText('Email'), 'jean.dupont@example.com')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Email déjà utilisé'))
  })

  it('supprime un locataire et rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get('/api/tenants', () => HttpResponse.json(deleted ? [] : [TENANT])),
      http.delete('/api/tenants/t1', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithQueryClient(<TenantsPage />)
    await waitFor(() => expect(screen.getByText('Jean Dupont')).toBeInTheDocument())

    const row = screen.getByText('Jean Dupont').closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() =>
      expect(screen.getByText("Aucun locataire enregistré pour l'instant.")).toBeInTheDocument(),
    )
  })
})
