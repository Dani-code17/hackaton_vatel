import { Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { navFor } from '../lib/universes'
import AppSwitcher from './AppSwitcher'
import { BrandBar, BottomNav, UserChip } from './Layouts'

export default function UniverseShell() {
  const { profile } = useAuth()
  const { universe, config } = useUniverse()

  const nav = navFor(universe, profile?.role)

  return (
    <div className="flex min-h-dvh flex-col bg-shell">
      <BrandBar
        title={config.barTitle}
        badge={<AppSwitcher />}
        right={<UserChip />}
      />

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <BottomNav nav={nav} />
    </div>
  )
}
