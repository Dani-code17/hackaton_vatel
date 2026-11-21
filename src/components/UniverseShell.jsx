import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { cx } from '../lib/format'
import { navFor } from '../lib/universes'
import { useLanguage } from '../i18n/language'
import AppSwitcher from './AppSwitcher'
import { BrandBar, BottomNav, UserChip } from './Layouts'
import { Icon } from './ui'

const MODULES = [
  { to: '/admin', labelKey: 'modules.dashboard', icon: 'dashboard', end: true },
  { to: '/admin/menus', labelKey: 'modules.menus', icon: 'restaurant_menu' },
  { to: '/admin/commandes', labelKey: 'modules.orders', icon: 'receipt_long' },
  { to: '/admin/stock', labelKey: 'modules.stock', icon: 'inventory_2' },
  { to: '/admin/materiel', labelKey: 'modules.equipment', icon: 'soup_kitchen' },
  { to: '/admin/comptabilite', labelKey: 'modules.accounting', icon: 'account_balance' },
  { to: '/admin/hygiene', labelKey: 'modules.hygiene', icon: 'clean_hands' },
  { to: '/admin/ecole', labelKey: 'modules.school', icon: 'school' },
]

export default function UniverseShell() {
  const { profile } = useAuth()
  const { universe, config } = useUniverse()
  const { t } = useLanguage()
  const [sheetOpen, setSheetOpen] = useState(false)

  const nav = navFor(universe, profile?.role)
  const showModules = ['gerant', 'directeur'].includes(profile?.role)

  const extra = showModules ? (
    <li className="flex-1">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex w-full flex-col items-center gap-1 pb-2 pt-2.5 font-display text-[10px] font-semibold text-slate-400 transition hover:text-slate-600"
      >
        <Icon name="apps" className="text-[22px]" />
        <span>{t('common.modules')}</span>
      </button>
    </li>
  ) : null

  return (
    <div className="flex min-h-dvh flex-col bg-shell">
      <BrandBar
        title={config.barTitle}
        subtitle={config.barSubtitle ?? config.title}
        right={
          <>
            <AppSwitcher />
            <UserChip />
          </>
        }
      />

      <main className="flex-1 px-5 pb-28 pt-4">
        <Outlet />
      </main>

      <BottomNav nav={nav} extra={extra} />

      {sheetOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-brand-900/50 backdrop-blur-sm">
          <div className="sheet-up w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {config.name}
                </p>
                <h2 className="font-display text-lg font-bold text-brand-900">{t('modules.all')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <Icon name="close" className="text-[18px]" />
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
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 font-display text-[12px] font-semibold transition',
                        isActive
                          ? 'border-coral-300 bg-coral-100 text-coral-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50',
                      )
                    }
                  >
                    <Icon name={module.icon} className="text-[18px]" />
                    {t(module.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}