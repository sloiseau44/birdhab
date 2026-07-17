import { apiClient } from './client'
import type { components } from '../types/api/property'

export type Property = components['schemas']['PropertyResponse']
export type PropertyRequest = components['schemas']['PropertyRequest']
export type PropertyType = components['schemas']['PropertyType']

export async function listProperties(): Promise<Property[]> {
  const { data } = await apiClient.get<Property[]>('/properties')
  return data
}

export async function createProperty(request: PropertyRequest): Promise<Property> {
  const { data } = await apiClient.post<Property>('/properties', request)
  return data
}

export async function updateProperty(id: string, request: PropertyRequest): Promise<Property> {
  const { data } = await apiClient.put<Property>(`/properties/${id}`, request)
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  await apiClient.delete(`/properties/${id}`)
}
