import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UniverseProvider, useUniverse } from './context/UniverseContext'
import { MobileShell } from './components/Layouts'
import UniverseShell from './components/UniverseShell'
import { ROLE_HOME } from './lib/format'
import Login from './pages/Login'
import MenuPage from './pages/eleve/Menu'
import ReservationsPage from './pages/eleve/Reservations'
import ComptePage from './pages/eleve/Compte'
import SuiviPage from './pages/parent/Suivi'
import HistoriquePage from './pages/parent/Historique'
import DashboardPage from './pages/admin/Dashboard'
import MenusPage from './pages/admin/Menus'
import CommandesPage from './pages/admin/Commandes'
import StockPage from './pages/admin/Stock'
import MaterielPage from './pages/admin/Materiel'
import ComptabilitePage from './pages/admin/Comptabilite'
import HygienePage from './pages/admin/Hygiene'
import EcolePage from './pages/admin/Ecole'
import SupervisionPage from './pages/dcs/Supervision'

const PARENT_NAV = [
  { to: '/parent', label: 'Suivi', icon: '👨‍👩‍👧', end: true },
  { to: '/parent/historique', label: 'Historique', icon: '🧾' },
]

function Loader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-shell">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
        Ouverture de la cantine…
      </div>
    </div>
  )
}

function Guard({ roles, children }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <Loader />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
        Profil applicatif introuvable pour ce compte. Contactez l'administrateur.
      </div>
    )
  }
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/login'} replace />
  }
  return children
}

function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Loader />
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[profile?.role] ?? '/login'} replace />
}

function EleveLayout() {
  const { config } = useUniverse()
  return <MobileShell nav={config.studentNav} />
}

export default function App() {
  return (
    <AuthProvider>
      <UniverseProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<HomeRedirect />} />

            <Route
              path="/eleve"
              element={
                <Guard roles={['eleve']}>
                  <EleveLayout />
                </Guard>
              }
            >
              <Route index element={<Navigate to="/eleve/menu" replace />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="compte" element={<ComptePage />} />
            </Route>

            <Route
              path="/parent"
              element={
                <Guard roles={['parent']}>
                  <MobileShell nav={PARENT_NAV} title="Espace parent" />
                </Guard>
              }
            >
              <Route index element={<SuiviPage />} />
              <Route path="historique" element={<HistoriquePage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <Guard roles={['gerant', 'directeur']}>
                  <UniverseShell />
                </Guard>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="menus" element={<MenusPage />} />
              <Route path="commandes" element={<CommandesPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="materiel" element={<MaterielPage />} />
              <Route path="comptabilite" element={<ComptabilitePage />} />
              <Route path="hygiene" element={<HygienePage />} />
              <Route path="ecole" element={<EcolePage />} />
            </Route>

            <Route
              path="/supervision"
              element={
                <Guard roles={['conseiller_dcs']}>
                  <UniverseShell />
                </Guard>
              }
            >
              <Route index element={<SupervisionPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UniverseProvider>
    </AuthProvider>
  )
}