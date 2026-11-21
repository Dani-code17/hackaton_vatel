import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDay, formatTime, todayISO } from '../../lib/format'
import { Alert, Badge, Button, Card, Empty, Field, Input, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function CommandesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState('')
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

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
      setMessage({
        tone: allergies.length ? 'amber' : 'teal',
        text: allergies.length
          ? `${label ?? data.student} servi — ⚠ allergie : ${allergies.join(', ')}`
          : `${label ?? data.student} servi (${data.meal})`,
      })
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
          <h2 className="text-lg font-bold text-slate-900">Commandes du jour</h2>
          <p className="text-xs text-slate-500">{formatDay(today)}</p>
        </div>
        <Badge tone="teal">● Temps réel</Badge>
      </div>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Servis" value={summary.served} tone="teal" />
        <Stat label="En attente" value={summary.waiting} tone="amber" />
        <Stat label="Recette" value={`${summary.revenue} F`} />
      </div>

      <Card>
        <SectionTitle>Pointage par pass QR</SectionTitle>
        <form onSubmit={manualServe} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Code du pass" hint="scannez ou saisissez le code affiché sur le téléphone de l'élève">
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

      <Card>
        <SectionTitle>File d&apos;attente</SectionTitle>
        {rows.length === 0 ? (
          <Empty
            title="Aucune réservation aujourd'hui"
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
                  <Badge tone="slate">Servi</Badge>
                ) : row.status === 'annulee' ? (
                  <Badge tone="rose">Annulé</Badge>
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
