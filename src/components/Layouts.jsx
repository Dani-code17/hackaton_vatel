import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cx, fcfa, ROLE_LABELS } from '../lib/format'
import SchoolSwitcher from './SchoolSwitcher'
import VatelLogo from './VatelLogo'

function LogoutButton() {
  const { signOut } = useAuth()
  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-200 hover:bg-white/10 hover:text-white"
      title="Se déconnecter"
    >
      Quitter
    </button>
  )
}

export function MobileShell({ nav, title }) {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const current = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname.startsWith(item.to))
  const screenTitle = title ?? current?.label ?? 'Cantine'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-shell">
      <header className="sticky top-0 z-20 bg-brand-900 px-4 pb-3 pt-3 text-white shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <VatelLogo light />
            <h1 className="mt-2 text-lg font-bold">{screenTitle}</h1>
            <p className="text-xs text-brand-200">
              {profile?.full_name} · {ROLE_LABELS[profile?.role] ?? ''}
            </p>
          </div>
          <div className="text-right">
            {profile?.role === 'eleve' ? (
              <div className="rounded-xl bg-white/10 px-3 py-1.5 ring-1 ring-white/25">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-200">
                  Solde
                </p>
                <p className="text-sm font-bold text-white">{fcfa(profile.balance)}</p>
              </div>
            ) : null}
            <div className="mt-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-white/10 bg-brand-900 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition',
                    isActive ? 'text-white' : 'text-brand-200/70 hover:text-brand-200',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cx(
                        'mb-0.5 h-0.5 w-6 rounded-full',
                        isActive ? 'bg-coral-500' : 'bg-transparent',
                      )}
                    />
                    <span className="text-lg leading-none">{item.icon}</span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function StaffShell({ tabs, title, subtitle }) {
  const { profile } = useAuth()

  return (
    <div className="min-h-dvh bg-shell">
      <header className="bg-brand-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <VatelLogo light compact />
            <h1 className="mt-1.5 text-base font-bold">{title}</h1>
            <p className="text-xs text-brand-200">
              {profile?.full_name}
              {profile && profile.full_name !== ROLE_LABELS[profile.role]
                ? ` · ${ROLE_LABELS[profile.role] ?? ''}`
                : ''}
              {subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SchoolSwitcher />
            <LogoutButton />
          </div>
        </div>

        <div className="no-scrollbar mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex gap-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex items-center gap-1 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition',
                      isActive
                        ? 'border-brand-200 text-white'
                        : 'border-transparent text-brand-200/80 hover:text-white',
                    )
                  }
                >
                  <span aria-hidden="true">{tab.icon}</span>
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
    </div>
  )
}