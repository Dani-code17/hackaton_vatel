import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDay, formatTime, todayISO } from '../../lib/format'
import { useLanguage } from '../../i18n/language'
import FlashOfferCard from '../../components/FlashOfferCard'
import QrScanner from '../../components/QrScanner'
import { Alert, Badge, Button, Card, Empty, Field, Icon, Input, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function CommandesPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [justServed, setJustServed] = useState(null)

  const today = todayISO()

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, status, qr_token, served_at, student:profiles(full_name, allergies), meal:meals!inner(name, service_date, price)')
      .eq('meal.service_date', today)
      .order('created_at')

    if (error) setMessage({ tone: 'rose', text: error.message })
    setRows(data ?? [])
    setLoading(false)
  }, [today])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('commandes-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const serve = async (qrToken, label) => {
    setBusyId(qrToken)
    setMessage(null)
    try {
      const { data, error } = await supabase.rpc('serve_reservation', { p_token: qrToken })
      if (error) throw error
      const allergies = data?.allergies ?? []
      setJustServed({
        student: data?.student ?? label ?? '—',
        meal: data?.meal ?? '',
        allergies,
        at: new Date(),
      })
      setToken('')
      await load()
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusyId(null)
    }
  }

  const manualServe = async (event) => {
    event.preventDefault()
    if (!token.trim()) return
    await serve(token.trim())
    setToken('')
  }

  const summary = useMemo(() => {
    const served = rows.filter((row) => row.status === 'servie')
    const waiting = rows.filter((row) => row.status === 'reservee')
    return {
      served: served.length,
      waiting: waiting.length,
      revenue: served.reduce((total, row) => total + (row.meal?.price ?? 25), 0),
    }
  }, [rows])

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('orders.title')}</h2>
          <p className="text-xs text-slate-500">{formatDay(today)}</p>
        </div>
        <Badge tone="teal">● Temps réel</Badge>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('accounting.served')} value={summary.served} tone="teal" />
        <Stat label={t('dashboard.waiting')} value={summary.waiting} tone="amber" />
        <Stat label={t('accounting.revenueShort')} value={`${summary.revenue} F`} />
      </div>

      <Card className="p-4">
        <SectionTitle>{t('orders.qrScan')}</SectionTitle>

        {justServed ? (
          <div
            className={
              'mb-3 rounded-2xl p-3 ring-1 ' +
              (justServed.allergies.length > 0
                ? 'bg-coral-100 ring-coral-300'
                : 'bg-emerald-50 ring-emerald-200')
            }
          >
            <div className="flex items-start gap-2">
              <span
                className={
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full ' +
                  (justServed.allergies.length > 0
                    ? 'bg-coral-500 text-on-accent'
                    : 'bg-emerald-500 text-white')
                }
              >
                <Icon
                  name={justServed.allergies.length > 0 ? 'warning' : 'check'}
                  className="text-[19px]"
                  filled
                />
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    'font-display text-[13px] font-bold ' +
                    (justServed.allergies.length > 0 ? 'text-coral-700' : 'text-emerald-700')
                  }
                >
                  {justServed.allergies.length > 0
                    ? t('scan.servedAllergy', { name: justServed.student })
                    : t('scan.servedOk', { name: justServed.student })}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">{justServed.meal}</p>
                {justServed.allergies.length > 0 ? (
                  <p className="mt-1 rounded-lg bg-white/70 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-coral-700">
                    ⚠ {t('scan.allergyAlert', { list: justServed.allergies.join(', ') })}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setJustServed(null)}
                aria-label={t('common.close')}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          </div>
        ) : null}

        <QrScanner onScan={(value) => serve(value.trim(), null)} busy={Boolean(busyId)} />
        <p className="my-2 text-center font-display text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {t('scan.orManual')}
        </p>
        <form onSubmit={manualServe} className="flex flex-col gap-2">
          <div className="flex-1">
            <Field label={t('orders.passCode')} hint="scannez ou saisissez le code affiché sur le téléphone de l'élève">
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="ex. aaf38e21c6ba62d6fd02d921"
              />
            </Field>
          </div>
          <Button type="submit" disabled={!token.trim()}>
            Valider le repas
          </Button>
        </form>
      </Card>

      <FlashOfferCard onPublished={load} />

      <Card className="p-4">
        <SectionTitle>{t('orders.queue')}</SectionTitle>
        {rows.length === 0 ? (
          <Empty
            title={t('dashboard.noReservation')}
            description="Les réservations des élèves apparaîtront ici en temps réel."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {row.student?.full_name ?? 'Élève'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {row.meal?.name}
                    {row.served_at ? ` · servi à ${formatTime(row.served_at)}` : ''}
                  </p>
                  {row.student?.allergies?.length ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.student.allergies.map((allergen) => (
                        <Badge key={allergen} tone="rose">
                          ⚠ {allergen}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>

                {row.status === 'servie' ? (
                  <Badge tone="slate">{t('status.servie')}</Badge>
                ) : row.status === 'annulee' ? (
                  <Badge tone="rose">{t('status.annulee')}</Badge>
                ) : (
                  <Button
                    className="text-xs"
                    disabled={busyId === row.qr_token}
                    onClick={() => serve(row.qr_token, row.student?.full_name)}
                  >
                    {busyId === row.qr_token ? 'Pointage…' : 'Pointer'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
