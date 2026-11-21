import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuth } from './AuthContext'
import { HEADER_COLOR, universeConfig, universeForModel } from '../lib/universes'

const UniverseContext = createContext(null)

export function UniverseProvider({ children }) {
  const { school, profile } = useAuth()
  // Le conseiller DCS pilote toujours le programme public (univers EPP GBT)
  const universe =
    profile?.role === 'conseiller_dcs' ? 'gbt' : universeForModel(school?.model)
  const config = useMemo(() => universeConfig(universe), [universe])

  useEffect(() => {
    document.documentElement.dataset.universe = universe
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', HEADER_COLOR[universe] ?? HEADER_COLOR.vatel)
  }, [universe])

  const value = useMemo(() => ({ universe, config, school }), [universe, config, school])
  return <UniverseContext.Provider value={value}>{children}</UniverseContext.Provider>
}

export function useUniverse() {
  const context = useContext(UniverseContext)
  if (!context) throw new Error('useUniverse doit être utilisé dans UniverseProvider')
  return context
}
