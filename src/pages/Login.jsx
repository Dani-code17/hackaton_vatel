import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_HOME, ROLE_LABEL_KEYS } from '../lib/format'
import { useLanguage } from '../i18n/language'
import LanguageSwitch from '../components/LanguageSwitch'
import { Alert, Button, Card, Field, Icon, Input } from '../components/ui'

const DEMO_ACCOUNTS = [
  { role: 'eleve', email: 'eleve@vatel.test' },
  { role: 'parent', email: 'parent@vatel.test' },
  { role: 'gerant', email: 'gerant@vatel.test' },
  { role: 'directeur', email: 'directeur@vatel.test' },
  { role: 'conseiller_dcs', email: 'dcs@vatel.test' },
]

export default function Login() {
  const { session, profile, signIn } = useAuth()
  const { t } = useLanguage()
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
    <div className="min-h-dvh bg-brand-900">
      <div className="flex justify-end px-5 pt-4">
        <LanguageSwitch />
      </div>
      <div className="px-5 pb-6 pt-2 text-center">
        <div className="mx-auto w-40 rounded-2xl bg-white p-3 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
          <img src="/vatel-logo.svg" alt="Vatel" className="mx-auto h-auto w-full" />
        </div>
        <p className="mt-4 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-brand-200">
          {t('login.eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-xl font-bold text-white">
          {t('login.tagline')}
        </h1>
      </div>

      <div className="rounded-t-[28px] bg-shell px-5 pb-10 pt-6">
        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-coral-500">
                {t('login.subtitle')}
              </p>
              <h2 className="font-display text-lg font-bold text-brand-900">{t('login.title')}</h2>
            </div>

            <Field label={t('login.email')}>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="prenom.nom@vatel.ci"
                required
              />
            </Field>

            <Field label={t('login.password')}>
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
              {busy ? t('common.loading') : t('login.submit')}
              {busy ? null : <Icon name="arrow_forward" className="text-[17px]" />}
            </Button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="mb-2 font-display text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {t('login.demo')} · Demo1234!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account)}
                  className="rounded-lg border border-slate-200 px-2.5 py-2 text-left transition hover:border-brand-200 hover:bg-brand-50"
                >
                  <span className="block font-display text-[11px] font-semibold text-brand-900">
                    {t(ROLE_LABEL_KEYS[account.role])}
                  </span>
                  <span className="block truncate text-[10px] text-slate-400">{account.email}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">
          {t('login.footer')}
        </p>
      </div>
    </div>
  )
}