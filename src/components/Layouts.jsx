import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { cx, fcfa } from '../lib/format'
import UserMenu from './UserMenu'
import VatelLogo from './VatelLogo'

export function MobileShell({ nav, title }) {
  const { profile } = useAuth()
  const { config } = useUniverse()
  const { pathname } = useLocation()

  const current = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname.startsWith(item.to))
  const screenTitle = title ?? current?.label ?? config.name

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-shell">
      <header className="sticky top-0 z-20 bg-brand-900 px-4 pb-3 pt-3 text-white shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <VatelLogo light compact />
            <h1 className="mt-2 text-lg font-bold">{screenTitle}</h1>
            <p className="text-xs text-brand-200">{config.chip}</p>
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
            <div className="mt-1 flex justify-end">
              <UserMenu light />
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
                    'flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold leading-tight transition',
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
                    <span className="text-center">{item.label}</span>
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