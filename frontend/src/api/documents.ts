import { apiClient } from './client'
import type { components } from '../types/api/document'

export type Document = components['schemas']['DocumentResponse']

export async function listDocuments(): Promise<Document[]> {
  const { data } = await apiClient.get<Document[]>('/documents')
  return data
}

export async function uploadDocument(tenantId: string, file: File): Promise<Document> {
  const formData = new FormData()
  formData.append('tenantId', tenantId)
  formData.append('file', file)
  // Pas de Content-Type explicite : Axios/le navigateur doit générer lui-même
  // le boundary multipart, qu'un header fixé à la main ne peut pas fournir.
  const { data } = await apiClient.post<Document>('/documents', formData)
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`)
}

export async function downloadDocument(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/documents/${id}/content`, { responseType: 'blob' })
  return data
}
