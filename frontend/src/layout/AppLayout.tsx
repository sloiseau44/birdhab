import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/properties', label: 'Biens' },
  { to: '/tenants', label: 'Locataires' },
  { to: '/leases', label: 'Baux' },
  { to: '/payments', label: 'Paiements' },
  { to: '/documents', label: 'Documents' },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-emerald-700 focus:shadow-md"
      >
        Aller au contenu principal
      </a>
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5">
          <span className="text-xl font-semibold text-slate-900">Birdhab</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm text-slate-500">{user?.email}</p>
          <NavLink
            to="/profile"
            className="mt-2 block text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Mon profil
          </NavLink>
          <button
            onClick={handleLogout}
            className="mt-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
