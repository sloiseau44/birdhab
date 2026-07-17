import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithQueryClient } from '../test/utils'
import { PropertiesPage } from './PropertiesPage'

const PROPERTY = {
  id: 'p1',
  address: { street: '12 rue des Lilas', postalCode: '75011', city: 'Paris' },
  type: 'LOGEMENT' as const,
  surface: 42,
  referenceRent: 950,
}

describe('PropertiesPage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("affiche un message quand la liste est vide", async () => {
    server.use(http.get('/api/properties', () => HttpResponse.json([])))

    renderWithQueryClient(<PropertiesPage />)

    await waitFor(() =>
      expect(screen.getByText("Aucun bien enregistré pour l'instant.")).toBeInTheDocument(),
    )
  })

  it('affiche les biens retournés par l\'API', async () => {
    server.use(http.get('/api/properties', () => HttpResponse.json([PROPERTY])))

    renderWithQueryClient(<PropertiesPage />)

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument())
    expect(screen.getByText('42 m²')).toBeInTheDocument()
    expect(screen.getByText('950 €')).toBeInTheDocument()
  })

  it('affiche une erreur si le chargement de la liste échoue', async () => {
    server.use(
      http.get('/api/properties', () =>
        HttpResponse.json({ message: 'Service indisponible' }, { status: 500 }),
      ),
    )

    renderWithQueryClient(<PropertiesPage />)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Service indisponible'))
  })

  it('crée un bien via le formulaire puis rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let created = false
    server.use(
      http.get('/api/properties', () =>
        HttpResponse.json(created ? [PROPERTY] : []),
      ),
      http.post('/api/properties', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          address: { street: '12 rue des Lilas', postalCode: '75011', city: 'Paris' },
          type: 'LOGEMENT',
          surface: 42,
          referenceRent: 950,
        })
        created = true
        return HttpResponse.json(PROPERTY, { status: 201 })
      }),
    )

    renderWithQueryClient(<PropertiesPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucun bien enregistré pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter un bien'))
    await user.type(screen.getByLabelText('Adresse'), '12 rue des Lilas')
    await user.type(screen.getByLabelText('Code postal'), '75011')
    await user.type(screen.getByLabelText('Ville'), 'Paris')
    await user.type(screen.getByLabelText('Surface (m²)'), '42')
    await user.type(screen.getByLabelText('Loyer de référence (€)'), '950')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument()
  })

  it('affiche le message serveur si la création échoue et garde le formulaire ouvert', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/properties', () => HttpResponse.json([])),
      http.post('/api/properties', () =>
        HttpResponse.json({ message: 'Adresse invalide' }, { status: 400 }),
      ),
    )

    renderWithQueryClient(<PropertiesPage />)
    await waitFor(() =>
      expect(screen.getByText("Aucun bien enregistré pour l'instant.")).toBeInTheDocument(),
    )

    await user.click(screen.getByText('Ajouter un bien'))
    await user.type(screen.getByLabelText('Adresse'), '12 rue des Lilas')
    await user.type(screen.getByLabelText('Code postal'), '75011')
    await user.type(screen.getByLabelText('Ville'), 'Paris')
    await user.type(screen.getByLabelText('Surface (m²)'), '42')
    await user.type(screen.getByLabelText('Loyer de référence (€)'), '950')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Adresse invalide'))
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument()
  })

  it('supprime un bien et rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get('/api/properties', () => HttpResponse.json(deleted ? [] : [PROPERTY])),
      http.delete('/api/properties/p1', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithQueryClient(<PropertiesPage />)
    await waitFor(() => expect(screen.getByText(/12 rue des Lilas/)).toBeInTheDocument())

    const row = screen.getByText(/12 rue des Lilas/).closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() =>
      expect(screen.getByText("Aucun bien enregistré pour l'instant.")).toBeInTheDocument(),
    )
  })
})
