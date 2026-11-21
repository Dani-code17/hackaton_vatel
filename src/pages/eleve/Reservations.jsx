import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay } from '../../lib/format'
import { Alert, Badge, Card, Icon, Spinner } from '../../components/ui'

const STATUS = {
  reservee: { tone: 'teal', label: 'Réservé' },
  servie: { tone: 'slate', label: 'Servi' },
  annulee: { tone: 'rose', label: 'Annulé' },
}

export default function ReservationsPage() {
  const { user, profile, refresh } = useAuth()
  const [rows, setRows] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [reservationsResult, ratingsResult] = await Promise.all([
      supabase
        .from('reservations')
        .select('id, status, qr_token, served_at, created_at, meal:meals(id, name, service_date, price, allergens)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('meal_ratings').select('meal_id, stars').eq('user_id', user.id),
    ])

    if (reservationsResult.error) {
      setMessage({ tone: 'rose', text: reservationsResult.error.message })
    }
    setRows(reservationsResult.data ?? [])
    setRatings(
      Object.fromEntries((ratingsResult.data ?? []).map((row) => [row.meal_id, row.stars])),
    )
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const cancel = async (reservation) => {
    setBusyId(reservation.id)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: reservation.id,
      })
      if (error) throw error
      await refresh()
      await load()
      setMessage({ tone: 'teal', text: 'Réservation annulée, solde recrédité.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusyId(null)
    }
  }

  const rate = async (mealId, stars) => {
    try {
      const { error } = await supabase
        .from('meal_ratings')
        .upsert({ meal_id: mealId, user_id: user.id, stars }, { onConflict: 'meal_id,user_id' })
      if (error) throw error
      setRatings((current) => ({ ...current, [mealId]: stars }))
      setMessage({ tone: 'teal', text: 'Merci pour votre note !' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    }
  }

  if (loading) return <Spinner />

  const active = rows.find((row) => row.status === 'reservee')
  const history = rows.filter((row) => row.id !== active?.id)
  const initials = (profile?.full_name ?? 'V')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold leading-tight text-brand-900">Pass repas</h1>
        <p className="mt-1 text-xs text-slate-500">Présentez le QR code au comptoir</p>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {active ? (
        <div className="overflow-hidden rounded-3xl bg-brand-900 text-white shadow-[0_16px_36px_rgba(7,42,93,0.28)]">
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-coral-500 font-display text-sm font-extrabold text-on-accent">
                V
              </span>
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-brand-200">
                  Pass cantine
                </p>
                <p className="font-display text-[13px] font-bold uppercase tracking-[0.1em]">VIP</p>
              </div>
            </div>
            <Badge tone="success">
              <Icon name="check_circle" className="text-[12px]" /> Validé
            </Badge>
          </div>

          <p className="px-4 font-display text-sm font-semibold">
            {formatDay(active.meal?.service_date)}
          </p>

          <div className="mx-4 mt-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-brand-200">
              Réservation midi · formule
            </p>
            <p className="mt-1 font-display text-[15px] font-bold leading-snug">
              {active.meal?.name}
            </p>
            <p className="mt-0.5 text-[11px] text-brand-200">{fcfa(active.meal?.price)}</p>
          </div>

          {profile?.allergies?.length ? (
            <div className="mx-4 mt-2 rounded-lg bg-coral-500/20 px-3 py-2 text-[11px] text-white ring-1 ring-coral-300/40">
              ⚠ Allergie déclarée : {profile.allergies.join(', ')} — cuisine informée
            </div>
          ) : null}

          <div className="mt-4 flex justify-center">
            <div className="relative rounded-2xl bg-white p-3">
              <QRCodeSVG value={active.qr_token} size={168} level="M" />
              <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-coral-500 font-display text-[13px] font-extrabold text-on-accent ring-4 ring-white">
                V
              </span>
            </div>
          </div>

          <div className="mx-4 mt-3 flex justify-center">
            <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] tracking-wider text-brand-200">
              {active.qr_token}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 font-display text-[11px] font-bold">
                {initials}
              </span>
              <div>
                <p className="font-display text-[12px] font-semibold">{profile?.full_name}</p>
                <p className="text-[10px] text-brand-200">
                  ID · {(user?.id ?? '').slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busyId === active.id}
              onClick={() => cancel(active)}
              className="font-display text-[11px] font-semibold text-brand-200 underline underline-offset-2 hover:text-white"
            >
              {busyId === active.id ? 'Annulation…' : 'Annuler'}
            </button>
          </div>
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Icon name="qr_code_2" className="text-[40px] text-slate-300" />
          <p className="mt-2 font-display text-sm font-semibold text-slate-700">Aucun pass actif</p>
          <p className="mt-1 text-xs text-slate-500">
            Réservez un repas depuis la carte pour obtenir votre pass QR.
          </p>
        </Card>
      )}

      <section>
        <h2 className="mb-2 font-display text-[12px] font-bold uppercase tracking-[0.1em] text-brand-900">
          Historique des repas
        </h2>

        {history.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
            Aucun repas consommé pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((reservation) => {
              const status = STATUS[reservation.status] ?? STATUS.reservee
              return (
                <li key={reservation.id}>
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[13px] font-semibold text-brand-900">
                          {reservation.meal?.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {reservation.meal ? formatDay(reservation.meal.service_date) : ''} ·{' '}
                          {fcfa(reservation.meal?.price)}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>

                    {reservation.status === 'servie' && reservation.meal?.id ? (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
                        <span className="font-display text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Notez ce plat
                        </span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              aria-label={`Noter ${star} sur 5`}
                              onClick={() => rate(reservation.meal.id, star)}
                              className={
                                'text-base leading-none transition ' +
                                (star <= (ratings[reservation.meal.id] ?? 0)
                                  ? 'text-amber-500'
                                  : 'text-slate-300')
                              }
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}