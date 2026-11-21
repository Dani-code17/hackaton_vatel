import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ROLE_HOME, ROLE_LABEL_KEYS, cx } from '../lib/format'
import { useLanguage } from '../i18n/language'
import LanguageSwitch from '../components/LanguageSwitch'
import { Alert, Button, Card, Field, Icon, Input } from '../components/ui'

// Trois comptes seulement : le jury doit voir le parcours élève, parent et gérant.
const DEMO_ACCOUNTS = [
  { role: 'eleve', email: 'eleve@vatel.test' },
  { role: 'parent', email: 'parent@vatel.test' },
  { role: 'gerant', email: 'gerant@vatel.test' },
]

export default function Login() {
  const { session, profile, signIn, signUp } = useAuth()
  const { t } = useLanguage()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('Demo1234!')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('eleve')
  const [childEmail, setChildEmail] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  if (session && profile) {
    return <Navigate to={ROLE_HOME[profile.role] ?? '/'} replace />
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        return
      }

      await signUp({ email, password, fullName, role })

      if (role === 'parent' && childEmail.trim()) {
        const { error: linkError } = await supabase.rpc('link_child', {
          p_child_email: childEmail.trim(),
        })
        if (linkError) setNotice(linkError.message)
      }
    } catch (err) {
      setError(err.message ?? t('login.failed'))
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (account) => {
    setMode('signin')
    setEmail(account.email)
    setPassword('Demo1234!')
    setError(null)
  }

  return (
    <div className="min-h-dvh bg-brand-900">
      <div className="flex justify-end px-5 pt-4">
        <LanguageSwitch />
      </div>

      <div className="px-5 pb-5 pt-1 text-center">
        <div className="mx-auto w-36 rounded-2xl bg-white p-3 shadow-[0_16px_36px_rgba(0,0,0,0.25)]">
          <img src="/vatel-logo.svg" alt="Vatel" className="mx-auto h-auto w-full" />
        </div>
        <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-[0.26em] text-brand-200">
          {t('login.eyebrow')}
        </p>
        <h1 className="mt-1 font-display text-lg font-bold text-white">{t('login.tagline')}</h1>
      </div>

      <div className="rounded-t-[28px] bg-shell px-4 pb-10 pt-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-[0_2px_12px_rgba(7,42,93,0.06)]">
          {[
            { id: 'signin', label: t('login.title') },
            { id: 'signup', label: t('login.create') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setMode(tab.id)
                setError(null)
                setNotice(null)
              }}
              className={cx(
                'h-11 rounded-xl font-display text-[13px] font-bold transition',
                mode === tab.id ? 'bg-brand-900 text-white' : 'text-slate-500',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="p-4">
          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' ? (
              <>
                <Field label={t('login.fullName')}>
                  <Input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Awa Traoré"
                    autoComplete="name"
                    required
                  />
                </Field>

                <div>
                  <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
                    {t('login.role')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {['eleve', 'parent'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setRole(option)}
                        className={cx(
                          'h-11 rounded-xl font-display text-[12px] font-semibold transition',
                          role === option ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600',
                        )}
                      >
                        {t(ROLE_LABEL_KEYS[option])}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

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
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            {mode === 'signup' && role === 'parent' ? (
              <Field label={t('login.childEmail')} hint={t('login.childEmailHint')}>
                <Input
                  type="email"
                  value={childEmail}
                  onChange={(event) => setChildEmail(event.target.value)}
                  placeholder="enfant@vatel.ci"
                />
              </Field>
            ) : null}

            {error ? <Alert tone="rose">{error}</Alert> : null}
            {notice ? <Alert tone="amber">{notice}</Alert> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? t('common.loading')
                : mode === 'signin'
                  ? t('login.submit')
                  : t('login.createAccount')}
              {busy ? null : <Icon name="arrow_forward" className="text-[17px]" />}
            </Button>
          </form>
        </Card>

        <div className="mt-4">
          <p className="mb-2 text-center font-display text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {t('login.demo')} · Demo1234!
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="rounded-xl bg-white px-2 py-2.5 text-center shadow-[0_2px_12px_rgba(7,42,93,0.06)] transition active:scale-[0.98]"
              >
                <span className="block font-display text-[11px] font-bold text-brand-900">
                  {t(ROLE_LABEL_KEYS[account.role])}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-400">
                  {account.email.split('@')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.14em] text-slate-400">
          {t('login.footer')}
        </p>
      </div>
    </div>
  )
}
