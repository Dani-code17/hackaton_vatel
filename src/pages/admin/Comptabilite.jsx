import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatDay, todayISO } from '../../lib/format'
import { Alert, Badge, Button, Card, Field, Input, SectionTitle, Spinner } from '../../components/ui'

export default function ComptabilitePage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [entry, setEntry] = useState({ service_date: todayISO(), served_count: '' })

  const canWrite = ['gerant', 'directeur'].includes(profile?.role)
  const canSign = profile?.role === 'directeur'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_accounting')
      .select('*')
      .order('service_date', { ascending: false })
      .limit(21)

    if (error) setMessage({ tone: 'rose', text: error.message })
    setRows(data ?? [])
    setLoading(false)
  }, [])

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
        },
        { onConflict: 'school_id,service_date' },
      )
      if (error) throw error
      await load()
      setMessage({ tone: 'teal', text: 'Journal mis à jour : les montants sont recalculés.' })
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
      setMessage({ tone: 'teal', text: 'Document signé électroniquement.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      versements: acc.versements + row.versements,
      salary: acc.salary + row.cantiniere_salary,
      fund: acc.fund + row.local_fund,
      served: acc.served + row.served_count,
    }),
    { revenue: 0, versements: 0, salary: 0, fund: 0, served: 0 },
  )

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <SectionTitle>Saisie du jour</SectionTitle>
          <form onSubmit={saveEntry} className="space-y-3">
            <Field label="Date">
              <Input
                type="date"
                value={entry.service_date}
                onChange={(event) => setEntry({ ...entry, service_date: event.target.value })}
                disabled={!canWrite}
                required
              />
            </Field>
            <Field label="Rationnaires servis" hint="25 F par repas, 40 % État, 5 F cantinière">
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
              {busy ? 'Calcul…' : 'Enregistrer et calculer'}
            </Button>
          </form>

          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Formules appliquées</p>
            <ul className="mt-1 space-y-0.5">
              <li>Recette = rationnaires × 25 F</li>
              <li>Versements = recette × 40 %</li>
              <li>Salaire = rationnaires × 5 F</li>
              <li>Fonds local = recette − versements − salaire</li>
            </ul>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <SectionTitle>Cahier de gestion journalier</SectionTitle>
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2 text-right">Servis</th>
                <th className="py-2 text-right">Recette</th>
                <th className="py-2 text-right">Versements</th>
                <th className="py-2 text-right">Cantinière</th>
                <th className="py-2 text-right">Fonds local</th>
                <th className="py-2 text-right">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 font-medium text-slate-800">{formatDay(row.service_date)}</td>
                  <td className="py-2 text-right">{row.served_count}</td>
                  <td className="py-2 text-right">{fcfa(row.revenue)}</td>
                  <td className="py-2 text-right">{fcfa(row.versements)}</td>
                  <td className="py-2 text-right">{fcfa(row.cantiniere_salary)}</td>
                  <td className="py-2 text-right font-semibold text-teal-700">
                    {fcfa(row.local_fund)}
                  </td>
                  <td className="py-2 text-right">
                    {row.signed_at ? (
                      <Badge tone="teal">Signé</Badge>
                    ) : canSign ? (
                      <Button variant="secondary" className="px-2 py-1 text-[11px]" onClick={() => sign(row)}>
                        Signer
                      </Button>
                    ) : (
                      <Badge tone="amber">À signer</Badge>
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
                <td className="py-2 text-right">{fcfa(totals.versements)}</td>
                <td className="py-2 text-right">{fcfa(totals.salary)}</td>
                <td className="py-2 text-right text-teal-700">{fcfa(totals.fund)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </div>
  )
}
