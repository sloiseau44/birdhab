import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('affiche le contenu normalement en absence d\'erreur', () => {
    render(
      <ErrorBoundary>
        <p>Contenu normal</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Contenu normal')).toBeInTheDocument()
  })

  it('affiche un message de repli avec un bouton de rechargement si un enfant lève une exception au rendu', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Une erreur inattendue est survenue.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
