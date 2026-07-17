import { apiClient } from './client'
import type { components } from '../types/api/tenant'

export type Tenant = components['schemas']['TenantResponse']
export type TenantRequest = components['schemas']['TenantRequest']

export async function listTenants(): Promise<Tenant[]> {
  const { data } = await apiClient.get<Tenant[]>('/tenants')
  return data
}

export async function createTenant(request: TenantRequest): Promise<Tenant> {
  const { data } = await apiClient.post<Tenant>('/tenants', request)
  return data
}

export async function updateTenant(id: string, request: TenantRequest): Promise<Tenant> {
  const { data } = await apiClient.put<Tenant>(`/tenants/${id}`, request)
  return data
}

export async function deleteTenant(id: string): Promise<void> {
  await apiClient.delete(`/tenants/${id}`)
}
