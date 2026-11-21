import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fcfa, todayISO } from '../../lib/format'
import { accentOf, modelConfig } from '../../lib/models'
import { useLanguage } from '../../i18n/language'
import CoverageGauge from '../../components/CoverageGauge'
import { Alert, Badge, Card, Empty, SectionTitle, Spinner, Stat } from '../../components/ui'

/** 11 000 000 → « 11 M » en français, « 11 M » en anglais (million/millions). */
function formatMillions(value, locale) {
  const millions = Number(value) / 1_000_000
  return `${millions.toLocaleString(locale, { maximumFractionDigits: 1 })} M`
}

export default function SupervisionPage() {
  const { t, locale } = useLanguage()
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
    return     <Empty title={t('sup.empty')} description={t('sup.emptyHint')} />
  }

  const totalServed = accounting.reduce((total, row) => total + row.served_count, 0)
  const totalVersements = accounting.reduce((total, row) => total + row.versements, 0)
  const alerts = supplies.filter((item) => Number(item.stock) <= Number(item.min_stock)).length

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="rounded-2xl bg-white px-3 py-2.5 shadow-[0_2px_12px_rgba(7,42,93,0.06)]">
        <p className="font-display text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {t('pam.reference')}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
          {t('pam.sourceShort')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('sup.schools')} value={schools.length} />
        <Stat label={t('dashboard.mealsServed')} value={totalServed} tone="teal" />
        <Stat label={t('sup.transfersToday')} value={fcfa(totalVersements)} />
      </div>

      <Card>
        <SectionTitle>{t('pam.national')}</SectionTitle>
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
            label={t('pam.students')}
            value={Number(indicators.eleves_couverts?.value ?? 194797).toLocaleString(locale)}
            hint={t('pam.studentsHint')}
          />
          <Stat
            label={t('pam.localPurchases')}
            value={
              Number(indicators.achats_locaux?.value ?? 489.6).toLocaleString(locale, {
                minimumFractionDigits: 1,
              }) + ' t'
            }
            hint={t('pam.localPurchasesHint')}
            tone="teal"
          />
          <Stat
            label={t('pam.schools')}
            value={Number(indicators.ecoles_couvertes?.value ?? 833).toLocaleString(locale)}
            hint={t('pam.schoolsHint')}
          />
          <Stat
            label={t('pam.mealsNational')}
            value={formatMillions(indicators.repas_servis_pam?.value ?? 11000000, locale)}
            hint={t('pam.mealsNationalHint')}
          />
        </div>

        <div className="mt-3 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.08em] text-brand-900">
            {t('pam.localValueChain')}
          </p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-brand-900/80">
            <li>
              {t('pam.localSchoolsLine', {
                schools: indicators.ecoles_achats_locaux?.value ?? 220,
                groups: indicators.groupements_producteurs?.value ?? 59,
              })}
            </li>
            <li>{t('pam.cooksLine', { count: indicators.cuisiniers_formes?.value ?? 240 })}</li>
          </ul>
        </div>

        <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-400">
          {t('pam.source')}
        </p>
      </Card>

      {alerts > 0 ? (
        <Alert tone="amber" title={t('sup.stockAlerts', { count: alerts })}>
          {t('sup.stockAlertsHint')}
        </Alert>
      ) : null}

      <SectionTitle>{t('sup.schoolsList')}</SectionTitle>

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
                    {t(modelConfig(school.model).short)}
                  </span>
                </div>
                {school.validated_at ? (
                  <Badge tone="teal">{t('sup.sheetSigned')}</Badge>
                ) : (
                  <Badge tone="amber">{t('status.emise')}</Badge>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">{t('dashboard.mealsServed')}</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {dayAccounting?.served_count ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">{t('sup.transfers')}</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {fcfa(dayAccounting?.versements)}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-slate-500">{t('modules.hygiene')}</dt>
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
                  <dt className="text-slate-500">{t('sup.ledger')}</dt>
                  <dd className="text-sm font-bold text-slate-800">
                    {dayAccounting?.signed_at ? t('common.signed') : t('common.notSigned')}
                  </dd>
                </div>
              </dl>

              {lowStock.length > 0 ? (
                <div className="rounded-lg bg-coral-100 p-2 text-xs text-coral-700">
                  {t('dashboard.lowStock', { list: lowStock.map((item) => item.name).join(', ') })}
                </div>
              ) : (
                <p className="text-xs text-brand-900">{t('dashboard.stockAbove')}</p>
              )}

              {lastHygiene ? (
                <p className="text-[11px] text-slate-400">
                  {t('sup.lastCheck')} {new Date(lastHygiene.checked_at).toLocaleString(locale)}
                </p>
              ) : null}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
