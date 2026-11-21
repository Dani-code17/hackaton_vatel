import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { cx } from '../lib/format'
import { navFor } from '../lib/universes'
import AppSwitcher from './AppSwitcher'
import UserMenu from './UserMenu'

const MODULES = [
  { to: '/admin', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/admin/menus', label: 'Menus', icon: '📋' },
  { to: '/admin/commandes', label: 'Commandes', icon: '🧾' },
  { to: '/admin/stock', label: 'Stock & rations', icon: '📦' },
  { to: '/admin/materiel', label: 'Matériel', icon: '🍳' },
  { to: '/admin/comptabilite', label: 'Comptabilité', icon: '💰' },
  { to: '/admin/hygiene', label: 'Hygiène', icon: '🧼' },
  { to: '/admin/ecole', label: 'École & RH', icon: '🏫' },
]

export default function UniverseShell() {
  const { profile } = useAuth()
  const { universe, config } = useUniverse()
  const { pathname } = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)

  const nav = navFor(universe, profile?.role)
  const showModules = ['gerant', 'directeur'].includes(profile?.role)

  return (
    <div className="min-h-dvh bg-shell">
      <header className="sticky top-0 z-30 bg-brand-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-200">
              {config.chip}
            </p>
            <h1 className="text-[11px] font-extrabold uppercase leading-tight tracking-wide sm:text-sm">
              {config.title}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AppSwitcher />
            <UserMenu light />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 border-t border-white/10 bg-brand-900 pb-[env(safe-area-inset-bottom)]">
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
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="text-center">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}

          {showModules ? (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex w-full flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-semibold text-brand-200/70 transition hover:text-brand-200"
              >
                <span className="mb-0.5 h-0.5 w-6 rounded-full bg-transparent" />
                <span className="text-base leading-none">⋯</span>
                <span>Modules</span>
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      {sheetOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-900/60 backdrop-blur-sm">
          <div className="universe-fade w-full rounded-t-3xl bg-white p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {config.name}
                </p>
                <h2 className="text-base font-bold text-slate-900">Tous les modules</h2>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {MODULES.map((module) => (
                <li key={module.to}>
                  <NavLink
                    to={module.to}
                    end={module.end}
                    onClick={() => setSheetOpen(false)}
                    className={({ isActive }) =>
                      cx(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                        isActive
                          ? 'border-coral-500 bg-coral-100 text-on-accent'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50',
                      )
                    }
                  >
                    <span>{module.icon}</span>
                    {module.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Page courante : {pathname}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
