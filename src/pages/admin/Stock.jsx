import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { downloadCsv, formatDay, todayISO } from '../../lib/format'
import { modelConfig, sourcesFor } from '../../lib/models'
import { useToast } from '../../context/toast'
import { useLanguage } from '../../i18n/language'
import { Alert, Badge, Button, Card, Empty, Field, Input, SectionTitle, Select, Spinner, Stat } from '../../components/ui'

export default function StockPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const [supplies, setSupplies] = useState([])
  const [movements, setMovements] = useState([])
  const [school, setSchool] = useState(null)
  const [localKg, setLocalKg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [rationnaires, setRationnaires] = useState(180)
  const [reception, setReception] = useState({
    supply_id: '',
    quantity: '',
    source: '',
    note: '',
    weight_kg: '',
  })

  const canWrite = profile?.role === 'gerant'
  const today = todayISO()
  const sources = sourcesFor(school?.model)
  const config = modelConfig(school?.model)

  const load = useCallback(async () => {
    setLoading(true)
    const [suppliesResult, movementsResult, schoolResult, receptionsResult] = await Promise.all([
      supabase.from('supplies').select('*').order('name'),
      supabase
        .from('supply_movements')
        .select('id, quantity, kind, rationnaires, service_date, created_at, supply:supplies(name, unit)')
        .order('created_at', { ascending: false })
        .limit(12),
      supabase.from('schools').select('*').eq('id', profile.school_id).maybeSingle(),
      supabase
        .from('supply_receptions')
        .select('quantity, weight_kg, source, supply:supplies(unit)')
        .eq('source', 'achats_locaux'),
    ])

    if (suppliesResult.error) setMessage({ tone: 'rose', text: suppliesResult.error.message })
    setSupplies(suppliesResult.data ?? [])
    setMovements(movementsResult.data ?? [])
    setSchool(schoolResult.data)
    setLocalKg(
      (receptionsResult.data ?? []).reduce((total, row) => {
        const weight = Number(row.weight_kg ?? 0)
        if (weight > 0) return total + weight
        return row.supply?.unit === 'kg' ? total + Number(row.quantity) : total
      }, 0),
    )
    setReception((current) => ({
      ...current,
      supply_id: current.supply_id || (suppliesResult.data?.[0]?.id ?? ''),
      source:
        current.source ||
        sourcesFor(schoolResult.data?.model)[0]?.value ||
        'achats_locaux',
    }))
    setLoading(false)
  }, [profile.school_id])

  useEffect(() => {
    load()
  }, [load])

  const preview = useMemo(
    () =>
      supplies
        .filter((item) => Number(item.qty_per_person) > 0)
        .map((item) => ({
          ...item,
          needed: Math.round(Number(item.qty_per_person) * Number(rationnaires) * 100) / 100,
        })),
    [supplies, rationnaires],
  )

  const shortfall = preview.filter((item) => item.needed > Number(item.stock))

  const applyRations = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.rpc('apply_rations', {
        p_school_id: profile.school_id,
        p_rationnaires: Number(rationnaires),
        p_service_date: today,
      })
      if (error) throw error
      await load()
      toast.success(t('toast.stockOut', { count: data.rationnaires }))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const submitReception = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const supply = supplies.find((item) => item.id === reception.supply_id)
      if (!supply) throw new Error('Sélectionnez un article')

      const quantity = Number(reception.quantity)
      if (!quantity || quantity <= 0) throw new Error('Quantité invalide')

      const { error: receptionError } = await supabase.from('supply_receptions').insert({
        school_id: profile.school_id,
        supply_id: supply.id,
        quantity,
        source: reception.source,
        note: reception.note.trim() || null,
        weight_kg:
          reception.source === 'achats_locaux'
            ? Number(reception.weight_kg) || (supply.unit === 'kg' ? quantity : null)
            : null,
      })
      if (receptionError) throw receptionError

      const { error: stockError } = await supabase
        .from('supplies')
        .update({ stock: Number(supply.stock) + quantity, updated_at: new Date().toISOString() })
        .eq('id', supply.id)
      if (stockError) throw stockError

      setReception({ ...reception, quantity: '', note: '', weight_kg: '' })
      await load()
      toast.success(t('toast.reception', { name: supply.name }))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {!canWrite ? (
        <Alert tone="amber">{t('stock.readOnly')}</Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('stock.items')} value={supplies.length} />
        <Stat
          label={t('stock.belowThreshold')}
          value={supplies.filter((item) => Number(item.stock) <= Number(item.min_stock)).length}
          tone="amber"
        />
        <Stat label={t('dashboard.rationnaires')} value={rationnaires} hint={formatDay(today)} />
        <Stat
          label={t('pam.localPurchases')}
          value={(localKg / 1000).toFixed(1) + ' t'}
          hint={t(config.short)}
          tone="teal"
        />
      </div>

      <div className="grid gap-4">
        <Card>
          <SectionTitle>{t('stock.reception')}</SectionTitle>
          <form onSubmit={submitReception} className="space-y-3">
            <Field label={t('stock.article')}>
              <Select
                value={reception.supply_id}
                onChange={(event) => setReception({ ...reception, supply_id: event.target.value })}
              >
                {supplies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stock} {item.unit})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('stock.quantityReceived')}>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={reception.quantity}
                  onChange={(event) => setReception({ ...reception, quantity: event.target.value })}
                  required
                  disabled={!canWrite}
                />
              </Field>
              <Field label={t('stock.source')}>
                <Select
                  value={reception.source}
                  onChange={(event) => setReception({ ...reception, source: event.target.value })}
                  disabled={!canWrite}
                >
                  {sources.map((source) => (
                    <option key={source.value} value={source.value}>
                      {t(source.label)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {reception.source === 'achats_locaux' ? (
              <Field
                label="Poids livré (kg)"
                hint="utilisé pour le suivi en tonnes des groupements agricoles"
              >
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={reception.weight_kg}
                  onChange={(event) =>
                    setReception({ ...reception, weight_kg: event.target.value })
                  }
                  placeholder="ex. 1200"
                  disabled={!canWrite}
                />
              </Field>
            ) : null}

            <Field label={t('stock.observation')}>
              <Input
                value={reception.note}
                onChange={(event) => setReception({ ...reception, note: event.target.value })}
                placeholder="Bon de livraison n°…"
                disabled={!canWrite}
              />
            </Field>

            <Button type="submit" className="w-full" disabled={busy || !canWrite}>
              {busy ? t('common.loading') : t('stock.receptionSubmit')}
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>{t('stock.rationsCalc')}</SectionTitle>
          <Field label={t('stock.rationnairesToday')} hint={t('stock.rationnairesHint')}>
            <Input
              type="number"
              min="1"
              value={rationnaires}
              onChange={(event) => setRationnaires(event.target.value)}
            />
          </Field>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-1.5">{t('stock.article')}</th>
                  <th className="px-2 py-1.5 text-right">{t('stock.need')}</th>
                  <th className="px-2 py-1.5 text-right">{t('stock.stock')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.map((item) => (
                  <tr key={item.id} className={item.needed > Number(item.stock) ? 'bg-coral-100' : ''}>
                    <td className="px-2 py-1.5 font-medium text-slate-700">{item.name}</td>
                    <td className="px-2 py-1.5 text-right">
                      {item.needed} {item.unit}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{item.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {shortfall.length > 0 ? (
            <p className="mt-2 text-xs font-semibold text-coral-700">
              {t('stock.shortfall')} {shortfall.map((item) => item.name).join(', ')}
            </p>
          ) : null}

          <Button
            className="mt-3 w-full"
            disabled={busy || !canWrite || shortfall.length > 0}
            onClick={applyRations}
          >
            {busy ? t('common.loading') : t('stock.applyRations', { count: rationnaires })}
          </Button>
        </Card>
      </div>

      <Card>
        <SectionTitle
          action={
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() =>
                downloadCsv(`inventaire-vivres-${today}.csv`, [
                  ['Article', 'Unite', 'Stock', 'Seuil', 'Ration par personne'],
                  ...supplies.map((item) => [
                    item.name,
                    item.unit,
                    item.stock,
                    item.min_stock,
                    item.qty_per_person,
                  ]),
                ])
              }
            >
              ⤓ Export CSV
            </Button>
          }
        >
          {t('stock.stockState')}
        </SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {supplies.map((item) => {
            const low = Number(item.stock) <= Number(item.min_stock)
            return (
              <li
                key={item.id}
                className={
                  'flex items-center justify-between rounded-2xl border px-3 py-2 text-sm ' +
                  (low ? 'border-coral-300 bg-coral-100' : 'border-slate-200 bg-white')
                }
              >
                <span className="font-medium text-slate-800">{item.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {item.stock} {item.unit}
                  </span>
                  {low ? <Badge tone="rose">seuil {item.min_stock}</Badge> : null}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <SectionTitle>Derniers mouvements</SectionTitle>
        {movements.length === 0 ? (
          <Empty title="Aucun mouvement" description="Les sorties de stock apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {movements.map((movement) => (
              <li key={movement.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-800">{movement.supply?.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {formatDay(movement.service_date)} · {movement.kind}
                    {movement.rationnaires ? ` · ${movement.rationnaires} rationnaires` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-coral-700">
                  -{movement.quantity} {movement.supply?.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
