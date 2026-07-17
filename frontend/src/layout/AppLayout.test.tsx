import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthContext'
import { AppLayout } from './AppLayout'

function renderLayout() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AppLayout>
          <p>Contenu de la page</p>
        </AppLayout>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('expose un lien d\'évitement vers le contenu principal, avant la nav dans l\'ordre du DOM', () => {
    renderLayout()

    const skipLink = screen.getByText('Aller au contenu principal')
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')

    // Le lien d'évitement doit précéder la navigation dans le DOM pour être le premier arrêt au clavier.
    const position = skipLink.compareDocumentPosition(screen.getByRole('navigation'))
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('affiche le contenu de la page à l\'intérieur du <main>', () => {
    renderLayout()

    expect(screen.getByRole('main')).toHaveTextContent('Contenu de la page')
  })
})
