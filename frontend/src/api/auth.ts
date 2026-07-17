import { apiClient, tokenStorage } from './client'
import type { components } from '../types/api/auth'

export type AuthResponse = components['schemas']['AuthResponse']
export type UserProfile = components['schemas']['UserProfile']
export type UpdateProfileRequest = components['schemas']['UpdateProfileRequest']
type RegisterRequest = components['schemas']['RegisterRequest']
type LoginRequest = components['schemas']['LoginRequest']

export async function register(request: RegisterRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', request)
  tokenStorage.setTokens(data)
  return data
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', request)
  tokenStorage.setTokens(data)
  return data
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (refreshToken) {
    await apiClient.post('/auth/logout', { refreshToken }).catch(() => {
      // Le jeton est peut-être déjà expiré/révoqué : on efface quand même la session locale.
    })
  }
  tokenStorage.clear()
}

export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/auth/me')
  return data
}

export async function updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
  const { data } = await apiClient.put<UserProfile>('/auth/me', request)
  return data
}
