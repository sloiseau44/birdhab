import { apiClient } from './client'
import type { components } from '../types/api/payment'

export type Payment = components['schemas']['PaymentResponse']
export type PaymentRequest = components['schemas']['PaymentRequest']
export type PaymentStatus = components['schemas']['PaymentStatus']
export type ReceiptRequest = components['schemas']['ReceiptRequest']

export async function listPayments(): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>('/payments')
  return data
}

export async function createPayment(request: PaymentRequest): Promise<Payment> {
  const { data } = await apiClient.post<Payment>('/payments', request)
  return data
}

export async function updatePayment(id: string, request: PaymentRequest): Promise<Payment> {
  const { data } = await apiClient.put<Payment>(`/payments/${id}`, request)
  return data
}

export async function deletePayment(id: string): Promise<void> {
  await apiClient.delete(`/payments/${id}`)
}

export async function generateReceipt(id: string, request: ReceiptRequest): Promise<Blob> {
  const { data } = await apiClient.post(`/payments/${id}/receipt`, request, { responseType: 'blob' })
  return data
}
