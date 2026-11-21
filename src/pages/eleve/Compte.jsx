import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/toast'
import { useLanguage } from '../../i18n/language'
import { supabase } from '../../lib/supabase'
import { cx, fcfa, formatTime } from '../../lib/format'
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Icon,
  Input,
  SectionTitle,
  Spinner,
} from '../../components/ui'

const QUICK_AMOUNTS = [500, 1500, 3000, 7500]
const METHODS = [
  { value: 'wave', label: 'Wave', icon: 'waves' },
  { value: 'orange_money', label: 'Orange', icon: 'phone_iphone' },
  { value: 'especes', label: 'Espèces', icon: 'payments' },
]

const KIND_LABELS = {
  recharge: 'compte.recharge',
  debit_repas: 'compte.payment',
  remboursement: 'compte.refund',
}

export default function ComptePage() {
  const { user, profile, refresh } = useAuth()
  const { t, locale } = useLanguage()
  const toast = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState(1500)
  const [method, setMethod] = useState('wave')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [allergiesInput, setAllergiesInput] = useState((profile?.allergies ?? []).join(', '))
  const [diet, setDiet] = useState(profile?.diet ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) setMessage({ tone: 'rose', text: error.message })
    setTransactions(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const recharge = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('recharge_wallet', {
        p_user_id: user.id,
        p_amount: Number(amount),
        p_method: method,
      })
      if (error) throw error
      await refresh()
      await load()
      toast.success(
        t('compte.topUpToast', {
          amount: fcfa(amount),
          method: METHODS.find((m) => m.value === method)?.label,
        }),
      )
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    setMessage(null)
    try {
      const allergies = allergiesInput
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const { error } = await supabase
        .from('profiles')
        .update({ allergies, diet: diet.trim() || null })
        .eq('id', user.id)
      if (error) throw error
      await refresh()
      toast.success(t('compte.profileToast'))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight text-brand-900">{t('nav.wallet')}</h1>
        <p className="mt-1 text-xs text-slate-500">{t('compte.wallet')}</p>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
              {t('menu.balance')}
            </p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-brand-900">
              {fcfa(profile?.balance)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{profile?.full_name}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-900 ring-1 ring-brand-200">
            <Icon name="account_balance_wallet" className="text-[20px]" />
          </span>
        </div>

        {profile?.allergies?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {profile.allergies.map((allergen) => (
              <Badge key={allergen} tone="rose">
                ⚠ {allergen}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>

      <Card className="p-4">
        <SectionTitle>{t('compte.topUp')}</SectionTitle>
        <form onSubmit={recharge} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={cx(
                  'rounded-lg border px-3 py-2.5 text-left transition',
                  Number(amount) === value
                    ? 'border-brand-900 bg-brand-900 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-200',
                )}
              >
                <span className="block font-display text-[13px] font-bold tabular-nums">
                  +{fcfa(value)}
                </span>
                <span
                  className={cx(
                    'text-[10px]',
                    Number(amount) === value ? 'text-brand-200' : 'text-slate-400',
                  )}
                >
                  {value <= 500
                    ? t('compte.snack')
                    : t('compte.mealsCount', { count: Math.floor(value / 1500) || 1 })}
                </span>
              </button>
            ))}
          </div>

          <Field label={t('compte.amountFcfa')}>
            <Input
              type="number"
              min="25"
              step="25"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>

          <div>
            <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
              {t('compte.method')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setMethod(item.value)}
                  className={cx(
                    'flex flex-col items-center gap-1 rounded-lg border py-2 font-display text-[10px] font-semibold transition',
                    method === item.value
                      ? 'border-brand-900 bg-brand-50 text-brand-900'
                      : 'border-slate-200 bg-white text-slate-500',
                  )}
                >
                  <Icon name={item.icon} className="text-[18px]" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>
            <Icon name="bolt" className="text-[17px]" />
            {busy ? t('common.loading') : t('compte.topUpAmount', { amount: fcfa(amount) })}
          </Button>
          <p className="text-center text-[10px] text-slate-400">{t('compte.simulated')}</p>
        </form>
      </Card>

      <Card className="p-4">
        <SectionTitle>{t('compte.profile')}</SectionTitle>
        <form onSubmit={saveProfile} className="space-y-3">
          <Field label={t('compte.allergies')} hint={t('compte.allergiesHint')}>
            <Input
              value={allergiesInput}
              onChange={(event) => setAllergiesInput(event.target.value)}
              placeholder="arachide, poisson"
            />
          </Field>
          <Field label={t('compte.diet')}>
            <Input
              value={diet}
              onChange={(event) => setDiet(event.target.value)}
              placeholder="sans porc, végétarien…"
            />
          </Field>
          <Button type="submit" variant="secondary" className="w-full" disabled={savingProfile}>
            {savingProfile ? t('common.loading') : t('compte.saveProfile')}
          </Button>
        </form>
      </Card>

      <section>
        <SectionTitle>{t('compte.history')}</SectionTitle>
        {loading ? (
          <Spinner />
        ) : transactions.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
            {t('compte.noMovement')}
          </p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cx(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      transaction.amount < 0
                        ? 'bg-coral-100 text-coral-500'
                        : 'bg-brand-50 text-brand-900',
                    )}
                  >
                    <Icon
                      name={transaction.amount < 0 ? 'restaurant' : 'add_card'}
                      className="text-[16px]"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[12px] font-semibold text-slate-800">
                      {KIND_LABELS[transaction.kind] ? t(KIND_LABELS[transaction.kind]) : transaction.kind}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(transaction.created_at).toLocaleDateString(locale)} ·{' '}
                      {formatTime(transaction.created_at)}
                      {transaction.reference ? ` · ${transaction.reference}` : ''}
                    </p>
                  </div>
                </div>
                <p
                  className={cx(
                    'shrink-0 font-display text-[13px] font-bold tabular-nums',
                    transaction.amount < 0 ? 'text-coral-500' : 'text-brand-900',
                  )}
                >
                  {transaction.amount > 0 ? '+' : ''}
                  {fcfa(transaction.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}