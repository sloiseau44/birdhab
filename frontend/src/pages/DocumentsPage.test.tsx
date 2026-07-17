import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { renderWithQueryClient } from '../test/utils'
import { DocumentsPage } from './DocumentsPage'

const TENANT = { id: 't1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }
const DOCUMENT = {
  id: 'd1',
  tenantId: 't1',
  fileName: 'piece-identite.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2048,
}

describe('DocumentsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  it("affiche un message si aucun locataire n'existe encore, sans formulaire d'upload", async () => {
    server.use(
      http.get('/api/documents', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([])),
    )

    renderWithQueryClient(<DocumentsPage />)

    await waitFor(() =>
      expect(
        screen.getByText('Il faut au moins un locataire enregistré pour uploader un document.'),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('Fichier')).not.toBeInTheDocument()
  })

  it('affiche les documents avec le nom du locataire résolu et la taille formatée', async () => {
    server.use(
      http.get('/api/documents', () => HttpResponse.json([DOCUMENT])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
    )

    renderWithQueryClient(<DocumentsPage />)

    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())
    const row = screen.getByText('piece-identite.pdf').closest('tr')!
    expect(within(row).getByText('Jean Dupont')).toBeInTheDocument()
    expect(screen.getByText('2 Ko')).toBeInTheDocument()
  })

  it('uploade un document (multipart) pour le locataire sélectionné puis rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let uploaded = false
    server.use(
      http.get('/api/documents', () => HttpResponse.json(uploaded ? [DOCUMENT] : [])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.post('/api/documents', async ({ request }) => {
        // request.formData() plante sous jsdom (le File de jsdom n'est pas reconnu par les
        // vérifications webidl internes d'undici) : on vérifie le corps brut à la place.
        // Note : jsdom ne préserve pas le nom du fichier à travers FormData + XHR, donc on
        // ne peut pas vérifier le nom exact ici, seulement la présence des deux parties.
        const body = await request.text()
        expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data/)
        expect(body).toContain('name="tenantId"')
        expect(body).toContain('t1')
        expect(body).toContain('name="file"')
        expect(body).toContain('application/pdf')
        uploaded = true
        return HttpResponse.json(DOCUMENT, { status: 201 })
      }),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() =>
      expect(screen.getByText('Aucun document enregistré pour l\'instant.')).toBeInTheDocument(),
    )

    await user.selectOptions(screen.getByLabelText('Locataire'), 't1')
    const file = new File(['%PDF-1.4'], 'piece-identite.pdf', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Fichier'), file)
    // jsdom ne valide jamais correctement un <input type="file" required> même rempli
    // (bug connu : https://github.com/jsdom/jsdom/issues/2422) — on soumet le formulaire
    // directement plutôt que de cliquer sur le bouton, pour court-circuiter cette validation.
    fireEvent.submit(screen.getByRole('button', { name: 'Uploader' }).closest('form')!)

    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())
  })

  it('affiche le message serveur si l\'upload échoue', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/documents', () => HttpResponse.json([])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.post('/api/documents', () =>
        HttpResponse.json({ message: 'Type de fichier non accepté' }, { status: 400 }),
      ),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() =>
      expect(screen.getByText('Aucun document enregistré pour l\'instant.')).toBeInTheDocument(),
    )

    await user.selectOptions(screen.getByLabelText('Locataire'), 't1')
    const file = new File(['not-a-pdf'], 'malware.exe', { type: 'application/pdf' })
    await user.upload(screen.getByLabelText('Fichier'), file)
    fireEvent.submit(screen.getByRole('button', { name: 'Uploader' }).closest('form')!)

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Type de fichier non accepté'),
    )
  })

  it('télécharge un document existant', async () => {
    const user = userEvent.setup()
    let capturedDownloadName: string | undefined
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      capturedDownloadName = this.download
    })
    server.use(
      http.get('/api/documents', () => HttpResponse.json([DOCUMENT])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.get('/api/documents/d1/content', () =>
        new HttpResponse(new Blob(['%PDF-1.4']), { headers: { 'Content-Type': 'application/pdf' } }),
      ),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())

    await user.click(screen.getByText('Télécharger'))

    await waitFor(() => expect(capturedDownloadName).toBe('piece-identite.pdf'))
  })

  it('supprime un document et rafraîchit la liste', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get('/api/documents', () => HttpResponse.json(deleted ? [] : [DOCUMENT])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.delete('/api/documents/d1', () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())

    const row = screen.getByText('piece-identite.pdf').closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() =>
      expect(screen.getByText('Aucun document enregistré pour l\'instant.')).toBeInTheDocument(),
    )
  })

  it('affiche le message serveur si la suppression échoue et garde le document dans la liste', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/documents', () => HttpResponse.json([DOCUMENT])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.delete('/api/documents/d1', () =>
        HttpResponse.json({ message: 'Document déjà archivé' }, { status: 409 }),
      ),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())

    const row = screen.getByText('piece-identite.pdf').closest('tr')!
    await user.click(within(row).getByText('Supprimer'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Document déjà archivé'))
    expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument()
  })

  it('affiche un message si le téléchargement échoue', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/documents', () => HttpResponse.json([DOCUMENT])),
      http.get('/api/tenants', () => HttpResponse.json([TENANT])),
      http.get('/api/documents/d1/content', () =>
        HttpResponse.json({ message: 'Fichier introuvable dans le stockage' }, { status: 404 }),
      ),
    )

    renderWithQueryClient(<DocumentsPage />)
    await waitFor(() => expect(screen.getByText('piece-identite.pdf')).toBeInTheDocument())

    await user.click(screen.getByText('Télécharger'))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Fichier introuvable dans le stockage'),
    )
  })
})
