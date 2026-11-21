import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { downloadCsv, fcfa, formatDay, todayISO } from '../../lib/format'
import { modelConfig } from '../../lib/models'
import { useToast } from '../../context/toast'
import { useLanguage } from '../../i18n/language'
import { Alert, Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../components/ui'

export default function ComptabilitePage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const [school, setSchool] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [entry, setEntry] = useState({ service_date: todayISO(), served_count: '' })

  const canWrite = ['gerant', 'directeur'].includes(profile?.role)
  const canSign = profile?.role === 'directeur'
  const config = modelConfig(school?.model)

  const load = useCallback(async () => {
    setLoading(true)
    const [rowsResult, schoolResult] = await Promise.all([
      supabase
        .from('daily_accounting')
        .select('*')
        .order('service_date', { ascending: false })
        .limit(21),
      supabase.from('schools').select('*').eq('id', profile.school_id).maybeSingle(),
    ])

    if (rowsResult.error) setMessage({ tone: 'rose', text: rowsResult.error.message })
    setRows(rowsResult.data ?? [])
    setSchool(schoolResult.data)
    setLoading(false)
  }, [profile.school_id])

  useEffect(() => {
    load()
  }, [load])

  const saveEntry = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('daily_accounting').upsert(
        {
          school_id: profile.school_id,
          service_date: entry.service_date,
          served_count: Number(entry.served_count),
          meal_price: school?.meal_price ?? 0,
          versements_pct: school?.versements_pct ?? 0,
          cantiniere_per_meal: school?.cantiniere_per_meal ?? 0,
          employer_subsidy_pct: school?.employer_subsidy_pct ?? 0,
        },
        { onConflict: 'school_id,service_date' },
      )
      if (error) throw error
      await load()
      toast.success(t('compta.saved'))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const sign = async (row) => {
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('sign_daily_accounting', { p_id: row.id })
      if (error) throw error
      await load()
      toast.success(t('toast.signed'))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const exportJournal = () => {
    const header = ['Date', 'Servis', 'Chiffre', 'Fonds', 'Signature']
    if (config.finance.versements) header.splice(2, 0, 'Versements', 'Cantiniere')
    if (config.finance.employer) header.splice(2, 0, 'Part employeur', 'Part salarie')

    downloadCsv('cahier-gestion-' + todayISO() + '.csv', [
      header,
      ...rows.map((row) => {
        const line = [row.service_date, row.served_count]
        if (config.finance.versements) line.push(row.versements, row.cantiniere_salary)
        if (config.finance.employer) line.push(row.employer_share, row.payer_share)
        line.push(row.revenue, row.local_fund, row.signed_at ? 'Signe' : 'En attente')
        return line
      }),
    ])
  }

  if (loading) return <Spinner />

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      versements: acc.versements + row.versements,
      salary: acc.salary + row.cantiniere_salary,
      employer: acc.employer + row.employer_share,
      payer: acc.payer + row.payer_share,
      fund: acc.fund + row.local_fund,
      served: acc.served + row.served_count,
    }),
    { revenue: 0, versements: 0, salary: 0, employer: 0, payer: 0, fund: 0, served: 0 },
  )

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="rounded-3xl bg-white shadow-[0_2px_12px_rgba(7,42,93,0.06)] px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">{school?.name}</p>
        <p className="text-xs text-slate-500">
          {t(config.label)} · {t(config.priceNote)}
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <SectionTitle>{t('compta.dailyEntry')}</SectionTitle>
          <form onSubmit={saveEntry} className="space-y-3">
            <Field label={t('common.date')}>
              <Input
                type="date"
                value={entry.service_date}
                onChange={(event) => setEntry({ ...entry, service_date: event.target.value })}
                disabled={!canWrite}
                required
              />
            </Field>
            <Field label={t('accounting.served')} hint={t(config.priceNote)}>
              <Input
                type="number"
                min="0"
                value={entry.served_count}
                onChange={(event) => setEntry({ ...entry, served_count: event.target.value })}
                disabled={!canWrite}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy || !canWrite}>
              {busy ? t('common.loading') : t('compta.saveCalc')}
            </Button>
          </form>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">{t('compta.formulas')}</p>
            <ul className="mt-1 space-y-0.5">
              <li>
                {t(config.finance.revenue, { price: school?.meal_price ?? 0 })} = rationnaires ×{' '}
                {school?.meal_price ?? 0} F
              </li>
              {config.finance.versements ? (
                <li>
                  {t(config.finance.versements, { pct: school?.versements_pct ?? 0 })} = recette ×{' '}
                  {school?.versements_pct ?? 0} %
                </li>
              ) : null}
              {config.finance.salary ? (
                <li>
                  {t(config.finance.salary, { amount: school?.cantiniere_per_meal ?? 0 })} =
                  rationnaires × {school?.cantiniere_per_meal ?? 0} F
                </li>
              ) : null}
              {config.finance.employer ? (
                <li>
                  {t(config.finance.employer, { pct: school?.employer_subsidy_pct ?? 0 })} = valeur ×{' '}
                  {school?.employer_subsidy_pct ?? 0} %
                </li>
              ) : null}
              <li>{t(config.finance.fund)} = reste après charges</li>
            </ul>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <SectionTitle
            action={
              <Button variant="ghost" className="text-xs" onClick={exportJournal}>
                ⤓ {t('common.export')}
              </Button>
            }
          >
            {t('compta.ledger')}
          </SectionTitle>
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Servis</th>
                <th className="py-2 text-right">Chiffre</th>
                {config.finance.versements ? (
                  <>
                    <th className="py-2 text-right">Versements</th>
                    <th className="py-2 text-right">Cantinière</th>
                  </>
                ) : null}
                {config.finance.employer ? (
                  <>
                    <th className="py-2 text-right">Employeur</th>
                    <th className="py-2 text-right">Salarié</th>
                  </>
                ) : null}
                <th className="py-2 text-right">Fonds</th>
                <th className="py-2 text-right">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 font-medium text-slate-800">{formatDay(row.service_date)}</td>
                  <td className="py-2 text-right">{row.served_count}</td>
                  <td className="py-2 text-right">{fcfa(row.revenue)}</td>
                  {config.finance.versements ? (
                    <>
                      <td className="py-2 text-right">{fcfa(row.versements)}</td>
                      <td className="py-2 text-right">{fcfa(row.cantiniere_salary)}</td>
                    </>
                  ) : null}
                  {config.finance.employer ? (
                    <>
                      <td className="py-2 text-right">{fcfa(row.employer_share)}</td>
                      <td className="py-2 text-right">{fcfa(row.payer_share)}</td>
                    </>
                  ) : null}
                  <td className="py-2 text-right font-semibold text-brand-900">{fcfa(row.local_fund)}</td>
                  <td className="py-2 text-right">
                    {row.signed_at ? (
                      <Badge tone="teal">{t('common.signed')}</Badge>
                    ) : canSign ? (
                      <Button
                        variant="secondary"
                        className="px-2 py-1 text-[11px]"
                        onClick={() => sign(row)}
                      >
                        {t('common.sign')}
                      </Button>
                    ) : (
                      <Badge tone="amber">{t('common.notSigned')}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold text-slate-800">
                <td className="py-2">Totaux</td>
                <td className="py-2 text-right">{totals.served}</td>
                <td className="py-2 text-right">{fcfa(totals.revenue)}</td>
                {config.finance.versements ? (
                  <>
                    <td className="py-2 text-right">{fcfa(totals.versements)}</td>
                    <td className="py-2 text-right">{fcfa(totals.salary)}</td>
                  </>
                ) : null}
                {config.finance.employer ? (
                  <>
                    <td className="py-2 text-right">{fcfa(totals.employer)}</td>
                    <td className="py-2 text-right">{fcfa(totals.payer)}</td>
                  </>
                ) : null}
                <td className="py-2 text-right text-brand-900">{fcfa(totals.fund)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </div>
  )
}