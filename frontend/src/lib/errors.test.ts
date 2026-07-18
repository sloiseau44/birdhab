import { describe, expect, it } from 'vitest'
import { extractBlobErrorMessage, extractErrorMessage, isRateLimited } from './errors'

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

describe('extractBlobErrorMessage', () => {
  it('relit un corps Blob JSON (cas des requêtes responseType: "blob") et en extrait le message', async () => {
    const blob = new Blob([JSON.stringify({ message: 'Fichier introuvable' })], {
      type: 'application/json',
    })
    const error = { response: { data: blob } }
    await expect(extractBlobErrorMessage(error)).resolves.toBe('Fichier introuvable')
  })

  it('retombe sur le message générique si le Blob ne contient pas de JSON exploitable', async () => {
    const blob = new Blob(['not json'], { type: 'text/plain' })
    const error = { response: { data: blob } }
    await expect(extractBlobErrorMessage(error, 'Repli')).resolves.toBe('Repli')
  })

  it('délègue à extractErrorMessage quand le corps n\'est pas un Blob', async () => {
    const error = { response: { data: { message: 'Erreur classique' } } }
    await expect(extractBlobErrorMessage(error)).resolves.toBe('Erreur classique')
  })
})

describe('isRateLimited', () => {
  it('reconnaît une erreur Axios avec statut 429', () => {
    expect(isRateLimited({ response: { status: 429 } })).toBe(true)
  })

  it('rejette tout autre statut ou forme inattendue', () => {
    expect(isRateLimited({ response: { status: 500 } })).toBe(false)
    expect(isRateLimited({ response: { status: 401 } })).toBe(false)
    expect(isRateLimited(new Error('boom'))).toBe(false)
    expect(isRateLimited(null)).toBe(false)
    expect(isRateLimited(undefined)).toBe(false)
  })
})
