import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOME, ROLE_LABELS } from '../lib/format'
import { Alert, Button, Card, Field, Input } from '../components/ui'

const DEMO_ACCOUNTS = [
  { role: 'eleve', email: 'eleve@vatel.test' },
  { role: 'parent', email: 'parent@vatel.test' },
  { role: 'gerant', email: 'gerant@vatel.test' },
  { role: 'directeur', email: 'directeur@vatel.test' },
  { role: 'conseiller_dcs', email: 'dcs@vatel.test' },
]

export default function Login() {
  const { session, profile, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (session && profile) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/'} replace />
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message ?? 'Connexion impossible')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword('Demo1234!')
    setError(null)
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-900 via-brand-700 to-shell px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center text-white">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-coral-500 text-2xl font-extrabold text-brand-900">
            V
          </div>
          <div>
            <p className="text-xl font-extrabold uppercase tracking-[0.35em]">Vatel</p>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-200">
              Cantine Campus Abidjan
            </p>
          </div>
          <p className="max-w-xs text-sm text-brand-100/90">
            Menus, réservations, pass repas et gestion de la cantine
          </p>
        </div>

        <Card className="space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Adresse e-mail">
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@ecole.ci"
                required
              />
            </Field>
            <Field label="Mot de passe">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            {error ? <Alert tone="rose">{error}</Alert> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Comptes de démonstration · mot de passe Demo1234!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-xl border border-slate-200 px-2 py-2 text-left text-xs font-semibold text-brand-900 hover:border-brand-200 hover:bg-brand-50"
                >
                  {ROLE_LABELS[account.role]}
                  <span className="block truncate text-[10px] font-normal text-slate-400">
                    {account.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-white/80">
          Projet hackathon · données de démonstration
        </p>
      </div>
    </div>
  )
}
