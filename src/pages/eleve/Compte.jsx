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
  { value: 'wave', label: 'Wave', icon: 'waves', phone: true },
  { value: 'orange_money', label: 'Orange Money', icon: 'phone_iphone', phone: true },
  { value: 'mtn', label: 'MTN MoMo', icon: 'smartphone', phone: true },
  { value: 'moov', label: 'Moov Money', icon: 'phone_android', phone: true },
  { value: 'especes', label: 'Espèces', icon: 'payments', phone: false },
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
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState('form')
  const [receipt, setReceipt] = useState(null)
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

  const selectedMethod = METHODS.find((m) => m.value === method)
  const needsPhone = selectedMethod?.phone ?? false

  // Étape 1 : on vérifie la saisie et on affiche le récapitulatif à confirmer
  const prepare = (event) => {
    event.preventDefault()
    setMessage(null)

    if (Number(amount) < 25) {
      setMessage({ tone: 'rose', text: t('recharge.minAmount') })
      return
    }
    if (needsPhone && phone.replace(/\D/g, '').length < 8) {
      setMessage({ tone: 'rose', text: t('recharge.phoneInvalid') })
      return
    }
    setStep('confirm')
  }

  // Étape 2 : confirmation explicite, puis écriture du crédit
  const recharge = async () => {
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

      const reference = `RC-${Date.now().toString(36).toUpperCase().slice(-6)}`
      setReceipt({
        reference,
        amount: Number(amount),
        method: selectedMethod?.label ?? method,
        phone: needsPhone ? phone : null,
        at: new Date(),
      })
      setStep('done')
      toast.success(t('compte.topUpToast', { amount: fcfa(amount), method: selectedMethod?.label }))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
      setStep('form')
    } finally {
      setBusy(false)
    }
  }

  const resetRecharge = () => {
    setStep('form')
    setReceipt(null)
    setPhone('')
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

      <div className="overflow-hidden rounded-3xl bg-brand-900 p-5 text-white shadow-[0_16px_36px_rgba(7,42,93,0.28)]">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-brand-200">
          {t('menu.balance')}
        </p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums leading-none">
          {fcfa(profile?.balance)}
        </p>
        <p className="mt-1.5 text-[11px] text-brand-200">{profile?.full_name}</p>

        {profile?.allergies?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {profile.allergies.map((allergen) => (
              <Badge key={allergen} tone="rose">
                ⚠ {allergen}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href="#recharge"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-coral-500 px-2 font-display text-[11.5px] font-bold text-on-accent transition active:scale-[0.97]"
          >
            <Icon name="add_card" className="text-[17px]" /> {t('compte.topUpShort')}
          </a>
          <a
            href="#historique"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-white/12 px-2 font-display text-[11.5px] font-bold text-white ring-1 ring-white/20 transition active:scale-[0.97]"
          >
            <Icon name="receipt_long" className="text-[17px]" /> {t('compte.historyShort')}
          </a>
        </div>
      </div>

      <Card id="recharge" className="p-4">
        <SectionTitle>{t('compte.topUp')}</SectionTitle>

        {step === 'done' && receipt ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                <Icon name="check" className="text-[22px]" filled />
              </span>
              <p className="mt-2 font-display text-lg font-bold text-emerald-700">
                {fcfa(receipt.amount)}
              </p>
              <p className="text-[11px] text-emerald-700/80">{t('recharge.success')}</p>
            </div>

            <dl className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-[11px]">
              {[
                [t('recharge.reference'), receipt.reference],
                [t('compte.method'), receipt.method],
                receipt.phone ? [t('recharge.phone'), receipt.phone] : null,
                [t('recharge.date'), receipt.at.toLocaleString(locale)],
                [t('recharge.newBalance'), fcfa(profile?.balance)],
              ]
                .filter(Boolean)
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-semibold text-slate-800">{value}</dd>
                  </div>
                ))}
            </dl>

            <Button variant="secondary" className="w-full" onClick={resetRecharge}>
              {t('recharge.again')}
            </Button>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-brand-900 p-4 text-white">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-brand-200">
                {t('recharge.summary')}
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fcfa(amount)}</p>
              <p className="mt-1 text-[11px] text-brand-200">
                {selectedMethod?.label}
                {needsPhone ? ` · ${phone}` : ''}
              </p>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">
              {needsPhone
                ? t('recharge.requestHint', { method: selectedMethod?.label, phone })
                : t('recharge.cashHint')}
            </p>

            <Button className="w-full" disabled={busy} onClick={recharge}>
              {busy ? t('common.loading') : t('recharge.confirm')}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep('form')} disabled={busy}>
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <form onSubmit={prepare} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className={cx(
                    'rounded-2xl border px-3 py-2.5 text-left transition',
                    Number(amount) === value
                      ? 'border-brand-900 bg-brand-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700',
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
                      'flex flex-col items-center gap-1 rounded-xl border py-2 font-display text-[10px] font-semibold transition',
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

            {needsPhone ? (
              <Field label={t('recharge.phone')} hint={t('recharge.phoneHint')}>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="07 00 00 00 00"
                />
              </Field>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              <Icon name="arrow_forward" className="text-[17px]" />
              {t('recharge.continue', { amount: fcfa(amount) })}
            </Button>
            <p className="text-center text-[10px] text-slate-400">{t('compte.simulated')}</p>
          </form>
        )}
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

      <section id="historique">
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