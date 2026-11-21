import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay, todayISO } from '../../lib/format'
import { daysGained, modelConfig } from '../../lib/models'
import CoverageGauge from '../../components/CoverageGauge'
import { Alert, Badge, Card, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [state, setState] = useState({
    school: null,
    reservations: [],
    accounting: null,
    lowStock: [],
    hygiene: null,
    localKg: 0,
    loading: true,
  })

  const today = todayISO()

  const load = useCallback(async () => {
    const [schoolResult, reservationsResult, accountingResult, stockResult, hygieneResult, receptionsResult] =
      await Promise.all([
        supabase.from('schools').select('*').eq('id', profile.school_id).maybeSingle(),
        supabase
          .from('reservations')
          .select('id, status, meal:meals!inner(name, service_date, price)')
          .eq('meal.service_date', today),
        supabase.from('daily_accounting').select('*').eq('service_date', today).maybeSingle(),
        supabase.from('supplies').select('name, stock, unit, min_stock').order('name'),
        supabase
          .from('hygiene_checks')
          .select('score, checked_at, note')
          .order('checked_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('supply_receptions')
          .select('quantity, weight_kg, source, supply:supplies(unit)')
          .eq('source', 'achats_locaux'),
      ])

    const localKg = (receptionsResult.data ?? []).reduce((total, row) => {
      const weight = Number(row.weight_kg ?? 0)
      if (weight > 0) return total + weight
      return row.supply?.unit === 'kg' ? total + Number(row.quantity) : total
    }, 0)

    setState({
      school: schoolResult.data,
      reservations: reservationsResult.data ?? [],
      accounting: accountingResult.data,
      lowStock: (stockResult.data ?? []).filter((item) => Number(item.stock) <= Number(item.min_stock)),
      hygiene: hygieneResult.data,
      localKg,
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

  const school = state.school
  const config = modelConfig(school?.model)
  const served = state.reservations.filter((r) => r.status === 'servie').length
  const booked = state.reservations.filter((r) => r.status === 'reservee').length
  const accounting = state.accounting

  const gained = daysGained({ localKg: state.localKg, enrolled: school?.enrolled_count ?? 0 })
  const covered = school?.cover_days_current ?? 0
  const projected = Math.min(school?.cover_days_target ?? 120, covered + gained)

  const financeRows = [
    { label: config.finance.revenue, value: fcfa(accounting?.revenue), strong: true },
    config.finance.versements
      ? { label: config.finance.versements, value: fcfa(accounting?.versements) }
      : null,
    config.finance.salary
      ? { label: config.finance.salary, value: fcfa(accounting?.cantiniere_salary) }
      : null,
    config.finance.employer
      ? { label: config.finance.employer, value: fcfa(accounting?.employer_share) }
      : null,
    config.finance.payer
      ? { label: config.finance.payer, value: fcfa(accounting?.payer_share) }
      : null,
    { label: config.finance.fund, value: fcfa(accounting?.local_fund), strong: true },
  ].filter(Boolean)

  const secondMoney = config.finance.versements
    ? { label: 'Versements (40 %)', value: fcfa(accounting?.versements), hint: 'part État' }
    : config.finance.employer
      ? {
          label: 'Part employeur',
          value: fcfa(accounting?.employer_share),
          hint: school?.employer_subsidy_pct + ' % subventionnés',
        }
      : { label: 'Marge du jour', value: fcfa(accounting?.local_fund) }
  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-brand-900 p-4 text-white shadow-[0_16px_36px_rgba(7,42,93,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-brand-200">
              {config.label}
            </p>
            <h2 className="mt-1 font-display text-lg font-bold leading-tight">{school?.name}</h2>
            <p className="mt-1 text-[11px] text-brand-200">
              {formatDay(today)} · {school?.enrolled_count ?? 0}{' '}
              {school?.model === 'entreprise' ? 'salariés' : 'élèves'}
            </p>
          </div>
          <Badge tone="success">● Temps réel</Badge>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-brand-200">
              Chiffre du jour
            </p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {fcfa(accounting?.revenue)}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-display text-[10px] font-semibold ring-1 ring-white/20">
            {config.short}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-brand-200">{config.priceNote}</p>
      </div>

      {state.lowStock.length > 0 ? (
        <Alert tone="amber" title={state.lowStock.length + ' article(s) sous le seuil'}>
          {state.lowStock.map((item) => item.name + ' (' + item.stock + ' ' + item.unit + ')').join(' · ')}
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Repas servis" value={served || accounting?.served_count || 0} tone="teal" />
        <Stat label="En attente" value={booked} hint="réservés non pointés" />
        <Stat label="Chiffre du jour" value={fcfa(accounting?.revenue)} tone="teal" />
        <Stat label={secondMoney.label} value={secondMoney.value} hint={secondMoney.hint} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Journal du jour — {config.short}</SectionTitle>
          <dl className="space-y-2 text-sm">
            {financeRows.map((row) => (
              <div
                key={row.label}
                className={
                  'flex justify-between ' + (row.strong ? 'border-t border-slate-100 pt-2' : '')
                }
              >
                <dt className={row.strong ? 'font-medium text-slate-700' : 'text-slate-500'}>
                  {row.label}
                </dt>
                <dd className={row.strong ? 'font-bold text-brand-900' : 'font-semibold'}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          {accounting?.signed_at ? (
            <p className="mt-3 text-xs text-brand-900">
              ✓ Signé le {new Date(accounting.signed_at).toLocaleDateString('fr-FR')}
            </p>
          ) : (
            <p className="mt-3 text-xs text-amber-600">En attente de signature du directeur</p>
          )}
        </Card>

        {config.showPamImpact ? (
          <Card>
            <SectionTitle>Impact PAM — couverture de l'année scolaire</SectionTitle>
            <CoverageGauge
              current={covered}
              projected={projected}
              target={school?.cover_days_target ?? 120}
              accent="teal"
              note={
                gained > 0
                  ? '+' + gained + ' jours grâce aux achats locaux (' + Math.round(state.localKg) + ' kg)'
                  : 'Aucun achat local enregistré sur cet établissement'
              }
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] uppercase text-slate-500">Achats locaux</p>
                <p className="text-sm font-bold text-slate-800">
                  {(state.localKg / 1000).toFixed(1)} t
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <p className="text-[10px] uppercase text-slate-500">Rationnaires</p>
                <p className="text-sm font-bold text-slate-800">{school?.enrolled_count ?? 0}</p>
              </div>
            </div>
          </Card>
        ) : (
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
        )}
      </div>

      {config.showPamImpact && state.hygiene ? (
        <Card>
          <SectionTitle>Dernier contrôle hygiène</SectionTitle>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-slate-900">{state.hygiene.score}/100</p>
            <p className="text-xs text-slate-500">
              {new Date(state.hygiene.checked_at).toLocaleString('fr-FR')}
            </p>
          </div>
          {state.hygiene.note ? (
            <p className="mt-1 text-xs text-slate-600">{state.hygiene.note}</p>
          ) : null}
        </Card>
      ) : null}

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