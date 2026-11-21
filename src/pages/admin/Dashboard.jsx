import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay, todayISO } from '../../lib/format'
import { Alert, Badge, Card, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [state, setState] = useState({
    school: null,
    reservations: [],
    accounting: null,
    lowStock: [],
    hygiene: null,
    loading: true,
  })

  const today = todayISO()

  const load = useCallback(async () => {
    const [schoolResult, reservationsResult, accountingResult, stockResult, hygieneResult] =
      await Promise.all([
        supabase.from('schools').select('*').eq('id', profile.school_id).maybeSingle(),
        supabase
          .from('reservations')
          .select('id, status, meal:meals!inner(name, service_date, price)')
          .eq('meal.service_date', today),
        supabase
          .from('daily_accounting')
          .select('*')
          .eq('service_date', today)
          .maybeSingle(),
        supabase.from('supplies').select('name, stock, unit, min_stock').order('name'),
        supabase
          .from('hygiene_checks')
          .select('score, checked_at, note')
          .order('checked_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    setState({
      school: schoolResult.data,
      reservations: reservationsResult.data ?? [],
      accounting: accountingResult.data,
      lowStock: (stockResult.data ?? []).filter((item) => Number(item.stock) <= Number(item.min_stock)),
      hygiene: hygieneResult.data,
      loading: false,
    })
  }, [profile.school_id, today])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_accounting' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  if (state.loading) return <Spinner />

  const served = state.reservations.filter((r) => r.status === 'servie').length
  const booked = state.reservations.filter((r) => r.status === 'reservee').length
  const accounting = state.accounting

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{state.school?.name ?? 'Établissement'}</h2>
          <p className="text-xs text-slate-500">
            {formatDay(today)} · {state.school?.enrolled_count ?? 0} élèves inscrits
          </p>
        </div>
        <Badge tone="teal">● Temps réel</Badge>
      </div>

      {state.lowStock.length > 0 ? (
        <Alert tone="amber" title={`${state.lowStock.length} article(s) sous le seuil`}>
          {state.lowStock.map((item) => `${item.name} (${item.stock} ${item.unit})`).join(' · ')}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Repas servis" value={served || accounting?.served_count || 0} tone="teal" />
        <Stat label="En attente" value={booked} hint="réservés non pointés" />
        <Stat label="Recette du jour" value={fcfa(accounting?.revenue)} tone="teal" />
        <Stat
          label="Versements (40 %)"
          value={fcfa(accounting?.versements)}
          hint="part État"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Journal comptable du jour</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Rationnaires servis</dt>
              <dd className="font-semibold">{accounting?.served_count ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Recette (25 F / repas)</dt>
              <dd className="font-semibold">{fcfa(accounting?.revenue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">État des versements (40 %)</dt>
              <dd className="font-semibold">{fcfa(accounting?.versements)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Salaire cantinière (5 F / plat)</dt>
              <dd className="font-semibold">{fcfa(accounting?.cantiniere_salary)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <dt className="font-medium text-slate-700">Fonds de fonctionnement</dt>
              <dd className="font-bold text-teal-700">{fcfa(accounting?.local_fund)}</dd>
            </div>
          </dl>
          {accounting?.signed_at ? (
            <p className="mt-3 text-xs text-teal-700">
              ✓ Signé le {new Date(accounting.signed_at).toLocaleDateString('fr-FR')}
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-600">En attente de signature du directeur</p>
          )}
        </Card>

        <Card>
          <SectionTitle>Dernier contrôle hygiène</SectionTitle>
          {state.hygiene ? (
            <div className="space-y-2">
              <p className="text-3xl font-bold text-slate-900">{state.hygiene.score}/100</p>
              <p className="text-xs text-slate-500">
                {new Date(state.hygiene.checked_at).toLocaleString('fr-FR')}
              </p>
              {state.hygiene.note ? (
                <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  {state.hygiene.note}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun contrôle enregistré.</p>
          )}
        </Card>
      </div>

      <Card>
        <SectionTitle>Réservations du jour</SectionTitle>
        {state.reservations.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune réservation pour aujourd&apos;hui.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {state.reservations.slice(0, 6).map((reservation) => (
              <li key={reservation.id} className="flex items-center justify-between py-2">
                <span className="truncate">{reservation.meal?.name}</span>
                <Badge tone={reservation.status === 'servie' ? 'slate' : 'teal'}>
                  {reservation.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
