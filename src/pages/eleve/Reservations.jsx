import { useCallback, useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay } from '../../lib/format'
import { Alert, Badge, Button, Card, Empty, Spinner } from '../../components/ui'

const STATUS = {
  reservee: { tone: 'teal', label: 'Réservé' },
  servie: { tone: 'slate', label: 'Servi' },
  annulee: { tone: 'rose', label: 'Annulé' },
}

export default function ReservationsPage() {
  const { user, refresh } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('reservations')
      .select('id, status, qr_token, served_at, created_at, meal:meals(name, service_date, price, allergens)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) setMessage({ tone: 'rose', text: error.message })
    setRows(data ?? [])
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

  if (loading) return <Spinner />

  if (rows.length === 0) {
    return (
      <Empty
        title="Aucun pass repas"
        description="Réservez un repas depuis le menu de la semaine pour obtenir votre pass."
      />
    )
  }

  return (
    <div className="space-y-4">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {rows.map((reservation) => {
        const status = STATUS[reservation.status] ?? STATUS.reservee
        const meal = reservation.meal
        const active = reservation.status === 'reservee'

        return (
          <Card key={reservation.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-slate-900">{meal?.name ?? 'Repas'}</h3>
                <p className="text-xs text-slate-500">
                  {meal ? formatDay(meal.service_date) : ''} · {fcfa(meal?.price)}
                </p>
              </div>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>

            {active ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
                <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                  <QRCodeSVG value={reservation.qr_token} size={140} level="M" />
                </div>
                <p className="text-center text-[11px] text-slate-500">
                  Présentez ce pass au comptoir
                  <br />
                  <span className="font-mono text-slate-400">{reservation.qr_token}</span>
                </p>
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={busyId === reservation.id}
                  onClick={() => cancel(reservation)}
                >
                  Annuler et être remboursé
                </Button>
              </div>
            ) : null}

            {reservation.served_at ? (
              <p className="text-xs text-slate-500">
                Servi à {new Date(reservation.served_at).toLocaleTimeString('fr-FR')}
              </p>
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}
