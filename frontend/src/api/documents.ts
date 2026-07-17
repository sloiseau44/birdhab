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
  const { data } = await apiClient.post<Document>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/documents/${id}`)
}

export async function downloadDocument(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`/documents/${id}/content`, { responseType: 'blob' })
  return data
}
