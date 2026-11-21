import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay, todayISO } from '../../lib/format'
import { useLanguage } from '../../i18n/language'
import { Alert, Badge, Button, Card, Empty, Field, Input, SectionTitle, Select, Spinner } from '../../components/ui'

export default function SuiviPage() {
  const { t } = useLanguage()
  const { user, refresh, school } = useAuth()
  const [children, setChildren] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [form, setForm] = useState({ childId: '', amount: 500, method: 'wave' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: kids, error } = await supabase
      .from('profiles')
      .select('id, full_name, balance, allergies, diet')
      .eq('parent_id', user.id)

    if (error) setMessage({ tone: 'rose', text: error.message })

    const childIds = (kids ?? []).map((kid) => kid.id)
    let reservationsData = []

    if (childIds.length > 0) {
      const { data } = await supabase
        .from('reservations')
        .select('id, status, served_at, meal:meals(name, service_date, price)')
        .in('user_id', childIds)
        .order('created_at', { ascending: false })
        .limit(20)
      reservationsData = data ?? []
    }

    setChildren(kids ?? [])
    setReservations(reservationsData)
    setForm((current) => ({
      ...current,
      childId: current.childId || (kids?.[0]?.id ?? ''),
    }))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const recharge = async (event) => {
    event.preventDefault()
    if (!form.childId) return
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('recharge_wallet', {
        p_user_id: form.childId,
        p_amount: Number(form.amount),
        p_method: form.method,
      })
      if (error) throw error
      await refresh()
      await load()
      setMessage({ tone: 'teal', text: `Recharge de ${fcfa(form.amount)} effectuée.` })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  if (children.length === 0) {
    return (
      <Empty
        title={t('parent.empty')}
        description="Le gérant doit rattacher votre compte à celui de votre enfant."
      />
    )
  }

  const today = todayISO()
  // Seuil d'alerte = moins de deux repas au tarif de l'établissement
  const lowBalanceThreshold = (school?.meal_price ?? 0) * 2

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {children.map((child) => {
        const todayReservations = reservations.filter(
          (reservation) => reservation.meal?.service_date === today,
        )
        return (
          <Card key={child.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{child.full_name}</h3>
                <p className="text-xs text-slate-500">
                  {todayReservations.length > 0
                    ? t('parent.mealsToday', { count: todayReservations.length })
                    : t('parent.noMealToday')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase text-slate-400">{t('compte.available')}</p>
                <p className="text-lg font-bold text-brand-900">{fcfa(child.balance)}</p>
              </div>
            </div>

            {child.allergies?.length ? (
              <div className="flex flex-wrap gap-1">
                {child.allergies.map((allergen) => (
                  <Badge key={allergen} tone="rose">
                    Allergie : {allergen}
                  </Badge>
                ))}
              </div>
            ) : null}

            {lowBalanceThreshold > 0 && child.balance < lowBalanceThreshold ? (
              <Alert tone="amber" title={t('menu.lowBalance')}>
                {t('parent.lowBalanceHint', {
                  amount: fcfa(Math.max(0, lowBalanceThreshold - child.balance)),
                })}
              </Alert>
            ) : null}
          </Card>
        )
      })}

      <Card>
        <SectionTitle>{t('parent.topUp')}</SectionTitle>
        <form onSubmit={recharge} className="space-y-3">
          <Field label={t('parent.child')}>
            <Select
              value={form.childId}
              onChange={(event) => setForm({ ...form, childId: event.target.value })}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.full_name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t('compte.amountFcfa')}>
              <Input
                type="number"
                min="25"
                step="25"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
              />
            </Field>
            <Field label={t('parent.method')}>
              <Select
                value={form.method}
                onChange={(event) => setForm({ ...form, method: event.target.value })}
              >
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="especes">Espèces</option>
              </Select>
            </Field>
          </div>

          <Button type="submit" className="w-full" disabled={busy || !form.childId}>
            {busy ? 'Traitement…' : `Recharger ${fcfa(form.amount)}`}
          </Button>
        </form>
      </Card>

      <section>
        <SectionTitle>{t('parent.recentMeals')}</SectionTitle>
        {reservations.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-center text-xs text-slate-500">
            Aucune réservation enregistrée.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {reservations.slice(0, 8).map((reservation) => (
              <li key={reservation.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{reservation.meal?.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {reservation.meal ? formatDay(reservation.meal.service_date) : ''}
                  </p>
                </div>
                <Badge
                  tone={
                    reservation.status === 'servie'
                      ? 'slate'
                      : reservation.status === 'annulee'
                        ? 'rose'
                        : 'teal'
                  }
                >
                  {t('status.' + reservation.status)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
