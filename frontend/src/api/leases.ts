import { apiClient } from './client'
import type { components } from '../types/api/lease'

export type Lease = components['schemas']['LeaseResponse']
export type LeaseRequest = components['schemas']['LeaseRequest']
export type LeaseStatus = components['schemas']['LeaseStatus']

export async function listLeases(): Promise<Lease[]> {
  const { data } = await apiClient.get<Lease[]>('/leases')
  return data
}

export async function createLease(request: LeaseRequest): Promise<Lease> {
  const { data } = await apiClient.post<Lease>('/leases', request)
  return data
}

export async function updateLease(id: string, request: LeaseRequest): Promise<Lease> {
  const { data } = await apiClient.put<Lease>(`/leases/${id}`, request)
  return data
}

export async function deleteLease(id: string): Promise<void> {
  await apiClient.delete(`/leases/${id}`)
}
