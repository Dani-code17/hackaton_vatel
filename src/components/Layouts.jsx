import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cx, fcfa, ROLE_LABELS } from '../lib/format'

function LogoutButton() {
  const { signOut } = useAuth()
  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
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
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">
              Cantine de Vatel
            </p>
            <h1 className="text-lg font-bold text-slate-900">{screenTitle}</h1>
            <p className="text-xs text-slate-500">
              {profile?.full_name} · {ROLE_LABELS[profile?.role] ?? ''}
            </p>
          </div>
          <div className="text-right">
            {profile?.role === 'eleve' ? (
              <div className="rounded-xl bg-teal-50 px-3 py-1.5 ring-1 ring-teal-200">
                <p className="text-[10px] font-semibold uppercase text-teal-700">Solde</p>
                <p className="text-sm font-bold text-teal-900">{fcfa(profile.balance)}</p>
              </div>
            ) : null}
            <div className="mt-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition',
                    isActive ? 'text-teal-700' : 'text-slate-400 hover:text-slate-600',
                  )
                }
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
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
    <div className="min-h-dvh bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-teal-700">
              Cantine de Vatel
            </p>
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">
              {profile?.full_name} · {ROLE_LABELS[profile?.role] ?? ''}
              {subtitle ? ` · ${subtitle}` : ''}
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex gap-1 pb-1">
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    cx(
                      'inline-flex items-center gap-1 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-semibold transition',
                      isActive
                        ? 'border-b-2 border-teal-600 text-teal-700'
                        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700',
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
