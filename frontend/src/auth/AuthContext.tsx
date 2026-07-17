import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { SESSION_EXPIRED_EVENT, tokenStorage } from '../api/client'
import type { UserProfile } from '../api/auth'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadCurrentUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const profile = await authApi.getCurrentUser()
      setUser(profile)
    } catch {
      tokenStorage.clear()
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCurrentUser()
  }, [loadCurrentUser])

  useEffect(() => {
    // Le refresh token a fini par expirer/être révoqué en cours de session (pas au montage) :
    // l'intercepteur de client.ts a déjà nettoyé les jetons, on aligne juste l'état React pour
    // que RequireAuth redirige vers /login au lieu de laisser la page courante en erreur muette.
    function handleSessionExpired() {
      setUser(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login({ email, password })
    await loadCurrentUser()
  }, [loadCurrentUser])

  const register = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      await authApi.register({ email, password, firstName, lastName })
      await loadCurrentUser()
    },
    [loadCurrentUser],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      refreshUser: loadCurrentUser,
    }),
    [user, isLoading, login, register, logout, loadCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
