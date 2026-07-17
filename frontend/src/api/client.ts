import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { components as AuthComponents } from '../types/api/auth'

type AuthResponse = AuthComponents['schemas']['AuthResponse']

const ACCESS_TOKEN_KEY = 'birdhab.accessToken'
const REFRESH_TOKEN_KEY = 'birdhab.refreshToken'

/** Émis quand le rafraîchissement du token échoue (session vraiment expirée) — voir AuthContext, qui déconnecte l'utilisateur en écoutant cet évènement. */
export const SESSION_EXPIRED_EVENT = 'birdhab:session-expired'

/**
 * Stockage des jetons en localStorage : compromis pragmatique pour une SPA
 * sans BFF (pas de cookie httpOnly possible sans backend dédié à ça). Accepté
 * pour ce projet ; à revoir si un jour un BFF est introduit.
 */
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (tokens: AuthResponse) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  },
}

// Passe par le proxy Vite en dev (voir vite.config.ts), qui route vers la Gateway (port 8080).
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    throw new Error('Aucun refresh token disponible')
  }

  // Requête directe (pas apiClient) pour éviter une boucle d'intercepteurs.
  const response = await axios.post<AuthResponse>('/api/auth/refresh', { refreshToken })
  tokenStorage.setTokens(response.data)
  return response.data.accessToken
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableConfig | undefined

    if (error.response?.status !== 401 || !originalConfig || originalConfig._retried) {
      throw error
    }
    originalConfig._retried = true

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const newAccessToken = await refreshPromise

      originalConfig.headers.Authorization = `Bearer ${newAccessToken}`
      return apiClient(originalConfig)
    } catch (refreshError) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      throw refreshError
    }
  },
)
