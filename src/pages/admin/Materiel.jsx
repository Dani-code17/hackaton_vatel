import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Alert, Badge, Button, Card, Empty, Field, Input, SectionTitle, Select, Spinner } from '../../components/ui'

const CONDITIONS = {
  bon: { label: 'Bon état', tone: 'teal' },
  a_remplacer: { label: 'À remplacer', tone: 'amber' },
  hors_service: { label: 'Hors service', tone: 'rose' },
}

export default function MaterielPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: 1, condition: 'bon', note: '' })

  const canWrite = profile?.role === 'gerant'

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('kitchen_items')
      .select('*')
      .order('name')

    if (error) setMessage({ tone: 'rose', text: error.message })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addItem = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('kitchen_items').insert({
        school_id: profile.school_id,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        condition: form.condition,
        note: form.note.trim() || null,
      })
      if (error) throw error
      setForm({ name: '', quantity: 1, condition: 'bon', note: '' })
      await load()
      setMessage({ tone: 'teal', text: 'Matériel ajouté à l’inventaire.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const updateItem = async (item, patch) => {
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('kitchen_items')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (error) throw error
      await load()
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (item) => {
    if (!window.confirm(`Retirer « ${item.name} » de l'inventaire ?`)) return
    const { error } = await supabase.from('kitchen_items').delete().eq('id', item.id)
    if (error) setMessage({ tone: 'rose', text: error.message })
    else await load()
  }

  if (loading) return <Spinner />

  const outOfService = items.filter((item) => item.condition !== 'bon')

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {!canWrite ? (
        <Alert tone="amber">Consultation seule : le gérant met à jour l&apos;inventaire.</Alert>
      ) : null}

      {outOfService.length > 0 ? (
        <Alert tone="amber" title={`${outOfService.length} équipement(s) à traiter`}>
          {outOfService.map((item) => item.name).join(' · ')}
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {canWrite ? (
          <Card>
            <SectionTitle>Ajouter un équipement</SectionTitle>
            <form onSubmit={addItem} className="space-y-3">
              <Field label="Désignation">
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Marmite 50 L"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantité">
                  <Input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  />
                </Field>
                <Field label="État">
                  <Select
                    value={form.condition}
                    onChange={(event) => setForm({ ...form, condition: event.target.value })}
                  >
                    <option value="bon">Bon état</option>
                    <option value="a_remplacer">À remplacer</option>
                    <option value="hors_service">Hors service</option>
                  </Select>
                </Field>
              </div>
              <Field label="Observation">
                <Input
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="Fond percé"
                />
              </Field>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Ajout…' : 'Ajouter'}
              </Button>
            </form>
          </Card>
        ) : null}

        <Card>
          <SectionTitle>Inventaire de la cuisine</SectionTitle>
          {items.length === 0 ? (
            <Empty title="Inventaire vide" description="Ajoutez le matériel de cuisine." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => {
                const condition = CONDITIONS[item.condition] ?? CONDITIONS.bon
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.name} <span className="text-slate-400">×{item.quantity}</span>
                      </p>
                      {item.note ? <p className="text-[11px] text-slate-500">{item.note}</p> : null}
                      <Badge tone={condition.tone}>{condition.label}</Badge>
                    </div>

                    {canWrite ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={item.condition}
                          onChange={(event) => updateItem(item, { condition: event.target.value })}
                          disabled={busy}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        >
                          <option value="bon">Bon</option>
                          <option value="a_remplacer">À remplacer</option>
                          <option value="hors_service">Hors service</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-coral-700 hover:bg-coral-100"
                        >
                          Retirer
                        </button>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
