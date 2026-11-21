import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fcfa, todayISO } from '../../lib/format'
import { accentOf, modelConfig } from '../../lib/models'
import CoverageGauge from '../../components/CoverageGauge'
import { Alert, Badge, Card, Empty, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function SupervisionPage() {
  const [schools, setSchools] = useState([])
  const [supplies, setSupplies] = useState([])
  const [hygiene, setHygiene] = useState([])
  const [accounting, setAccounting] = useState([])
  const [indicators, setIndicators] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const today = todayISO()

  const load = useCallback(async () => {
    setLoading(true)
    const [schoolsResult, suppliesResult, hygieneResult, accountingResult, indicatorsResult] =
      await Promise.all([
        supabase.from('schools').select('*').order('created_at'),
        supabase.from('supplies').select('school_id, name, stock, unit, min_stock'),
        supabase
          .from('hygiene_checks')
          .select('school_id, score, checked_at')
          .order('checked_at', { ascending: false }),
        supabase
          .from('daily_accounting')
          .select('school_id, service_date, served_count, revenue, versements, signed_at')
          .eq('service_date', today),
        supabase.from('impact_indicators').select('*'),
      ])

    if (schoolsResult.error) setMessage({ tone: 'rose', text: schoolsResult.error.message })
    setSchools(schoolsResult.data ?? [])
    setSupplies(suppliesResult.data ?? [])
    setHygiene(hygieneResult.data ?? [])
    setAccounting(accountingResult.data ?? [])
    setIndicators(
      Object.fromEntries((indicatorsResult.data ?? []).map((row) => [row.key, row])),
    )
    setLoading(false)
  }, [today])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />

  if (schools.length === 0) {
    return <Empty title="Aucune école supervisée" description="Les écoles rattachées apparaîtront ici." />
  }

  const totalServed = accounting.reduce((total, row) => total + row.served_count, 0)
  const totalVersements = accounting.reduce((total, row) => total + row.versements, 0)
  const alerts = supplies.filter((item) => Number(item.stock) <= Number(item.min_stock)).length

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Écoles" value={schools.length} />
        <Stat label="Repas servis" value={totalServed} tone="teal" />
        <Stat label="Versements du jour" value={fcfa(totalVersements)} />
      </div>

      <Card>
        <SectionTitle>Impact PAM — programme national</SectionTitle>
        <CoverageGauge
          current={indicators.couverture_jours?.value ?? 73}
          projected={indicators.couverture_projetee?.value ?? 98}
          target={indicators.couverture_jours?.target ?? 120}
          accent="teal"
          note={
            (indicators.couverture_projetee?.note ?? '+25 jours gagnés') +
            ' — ' +
            (indicators.couverture_jours?.note ?? 'moyenne nationale PAM')
          }
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat
            label="Élèves couverts"
            value={Number(indicators.eleves_couverts?.value ?? 194797).toLocaleString('fr-FR')}
            hint={indicators.eleves_couverts?.note}
          />
          <Stat
            label="Achats locaux"
            value={
              Number(indicators.achats_locaux?.value ?? 489.6).toLocaleString('fr-FR', {
                minimumFractionDigits: 1,
              }) + ' t'
            }
            hint={indicators.achats_locaux?.note}
            tone="teal"
          />
        </div>
      </Card>

      {alerts > 0 ? (
        <Alert tone="amber" title={`${alerts} alerte(s) de stock`}>
          Une ou plusieurs écoles sont sous le seuil sur des articles essentiels.
        </Alert>
      ) : null}

      <SectionTitle>Établissements</SectionTitle>

      <div className="grid gap-4">
        {schools.map((school) => {
          const schoolSupplies = supplies.filter((item) => item.school_id === school.id)
          const lowStock = schoolSupplies.filter(
            (item) => Number(item.stock) <= Number(item.min_stock),
          )
          const lastHygiene = hygiene.find((item) => item.school_id === school.id)
          const dayAccounting = accounting.find((item) => item.school_id === school.id)

          return (
            <Card key={school.id} className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{school.name}</h3>
                  <p className="text-xs text-slate-500">
                    {school.city} · {school.enrolled_count}{' '}
                    {school.model === 'entreprise' ? 'salariés' : 'élèves'} · {school.meal_price} F
                  </p>
                  <span
                    className={
                      'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                      accentOf(school.model).badge
                    }
                  >
                    {modelConfig(school.model).short}
                  </span>
                </div>
                {school.validated_at ? (
                  <Badge tone="teal">Fiche signée</Badge>
                ) : (
                  <Badge tone="amber">À valider</Badge>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">Repas servis</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {dayAccounting?.served_count ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">Versements</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {fcfa(dayAccounting?.versements)}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">Hygiène</dt>
                  <dd
                    className={
                      'text-sm font-bold ' +
                      (!lastHygiene
                        ? 'text-slate-400'
                        : lastHygiene.score >= 80
                          ? 'text-brand-900'
                          : lastHygiene.score >= 50
                            ? 'text-amber-600'
                            : 'text-coral-700')
                    }
                  >
                    {lastHygiene ? `${lastHygiene.score}/100` : '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">Journal</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {dayAccounting?.signed_at ? 'Signé' : 'Non signé'}
                  </dd>
                </div>
              </dl>

              {lowStock.length > 0 ? (
                <div className="rounded-lg bg-coral-100 p-2 text-xs text-coral-700">
                  Stock bas : {lowStock.map((item) => item.name).join(', ')}
                </div>
              ) : (
                <p className="text-xs text-brand-900">Stocks au-dessus des seuils.</p>
              )}

              {lastHygiene ? (
                <p className="text-[11px] text-slate-400">
                  Dernier contrôle : {new Date(lastHygiene.checked_at).toLocaleString('fr-FR')}
                </p>
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
