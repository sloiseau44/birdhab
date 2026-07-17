import { describe, expect, it } from 'vitest'
import { extractErrorMessage } from './errors'

describe('extractErrorMessage', () => {
  it('extrait le message depuis une erreur Axios avec un corps ErrorResponse', () => {
    const error = { response: { data: { message: 'Email déjà utilisé' } } }
    expect(extractErrorMessage(error)).toBe('Email déjà utilisé')
  })

  it('retourne le message de repli par défaut si la forme est inattendue', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('Une erreur est survenue')
    expect(extractErrorMessage(null)).toBe('Une erreur est survenue')
    expect(extractErrorMessage(undefined)).toBe('Une erreur est survenue')
    expect(extractErrorMessage({ response: { data: {} } })).toBe('Une erreur est survenue')
  })

  it('retourne le message de repli personnalisé fourni', () => {
    expect(extractErrorMessage({}, 'Échec de la sauvegarde')).toBe('Échec de la sauvegarde')
  })
})
