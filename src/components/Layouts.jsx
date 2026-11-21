import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { cx, fcfa } from '../lib/format'
import { Icon } from './ui'

function initialsOf(name) {
  return (name ?? 'V')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function BrandBar({ title, subtitle, right }) {
  return (
    <header className="sticky top-0 z-30 bg-brand-900 text-white shadow-[0_2px_10px_rgba(7,42,93,0.18)]">
      <div className="flex items-center justify-between gap-2 px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral-500 font-display text-[13px] font-extrabold text-on-accent">
            V
          </span>
          <div className="min-w-0 leading-none">
            <p className="truncate font-display text-[13px] font-extrabold uppercase tracking-[0.12em]">
              {title}
            </p>
            <p className="truncate text-[9px] uppercase tracking-[0.12em] text-brand-200">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">{right}</div>
      </div>
    </header>
  )
}

export function UserChip({ compact = false }) {
  const { profile, signOut } = useAuth()
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cx(
          'grid place-items-center rounded-full bg-brand-700 font-display font-bold text-white ring-1 ring-white/25',
          compact ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]',
        )}
      >
        {initialsOf(profile?.full_name)}
      </span>
      <button
        type="button"
        onClick={signOut}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="grid h-7 w-7 place-items-center rounded-full text-brand-200 transition hover:bg-white/10 hover:text-white"
      >
        <Icon name="logout" className="text-[17px]" />
      </button>
    </div>
  )
}

function BottomNav({ nav, extra }) {
  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl shadow-[0_-4px_16px_rgba(7,42,93,0.06)]">
      <ul className="flex">
        {nav.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'relative flex h-full flex-col items-center gap-1 pb-2 pt-2.5 font-display text-[9.5px] font-semibold transition',
                  isActive ? 'text-coral-500' : 'text-slate-400 hover:text-slate-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-b-full bg-coral-500" />
                  ) : null}
                  <Icon name={item.icon} className="text-[22px]" filled={isActive} />
                  <span className="flex min-h-[20px] items-start justify-center px-0.5 text-center leading-[1.15]">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        {extra}
      </ul>
    </nav>
  )
}

export function MobileShell({ nav, title }) {
  const { profile } = useAuth()
  const { config } = useUniverse()
  const { pathname } = useLocation()
  const current = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname.startsWith(item.to))
  const screenTitle = title ?? current?.label ?? config.name

  return (
    <div className="flex min-h-dvh flex-col bg-shell">
      <BrandBar
        title={config.barTitle}
        subtitle={config.barSubtitle ?? config.name}
        right={
          <>
            {profile?.role === 'eleve' ? (
              <span className="rounded-full bg-white/10 px-2 py-1 font-display text-[10px] font-bold text-white ring-1 ring-white/20">
                {fcfa(profile.balance)}
              </span>
            ) : null}
            <UserChip />
          </>
        }
      />

      <main className="flex-1 px-5 pb-28 pt-4">
        {title ? (
          <h1 className="mb-3 font-display text-xl font-bold text-brand-900">{screenTitle}</h1>
        ) : null}
        <Outlet />
      </main>

      <BottomNav nav={nav} />
    </div>
  )
}

export { BottomNav }