import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { addDays, fcfa, formatDay, todayISO } from '../../lib/format'
import { Alert, Badge, Button, Card, Empty, Field, Input, SectionTitle, Spinner, Textarea } from '../../components/ui'

const emptyForm = {
  service_date: todayISO(),
  name: '',
  description: '',
  price: 25,
  capacity: 150,
  vegetarian: false,
  allergens: '',
}

export default function MenusPage() {
  const { profile } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const canWrite = profile?.role === 'gerant'
  const today = todayISO()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meals')
      .select('*, reservations(count)')
      .eq('school_id', profile.school_id)
      .gte('service_date', today)
      .lte('service_date', addDays(today, 13))
      .order('service_date')
      .order('name')

    if (error) setMessage({ tone: 'rose', text: error.message })
    setMeals(data ?? [])
    setLoading(false)
  }, [profile.school_id, today])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const allergens = form.allergens
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const { error } = await supabase.from('meals').insert({
        school_id: profile.school_id,
        service_date: form.service_date,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        capacity: Number(form.capacity),
        vegetarian: form.vegetarian,
        allergens,
      })
      if (error) throw error
      setForm({ ...emptyForm, service_date: form.service_date })
      await load()
      setMessage({ tone: 'teal', text: 'Plat ajouté au menu.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (meal) => {
    if (!window.confirm(`Supprimer « ${meal.name} » ?`)) return
    const { error } = await supabase.from('meals').delete().eq('id', meal.id)
    if (error) setMessage({ tone: 'rose', text: error.message })
    else {
      await load()
      setMessage({ tone: 'teal', text: 'Plat supprimé.' })
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      {!canWrite ? (
        <Alert tone="amber">Consultation seule : seul le gérant peut modifier les menus.</Alert>
      ) : null}

      <div className="grid gap-4">
        {canWrite ? (
          <Card>
            <SectionTitle>Ajouter un plat</SectionTitle>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de service">
                  <Input
                    type="date"
                    value={form.service_date}
                    onChange={(event) => setForm({ ...form, service_date: event.target.value })}
                    required
                  />
                </Field>
                <Field label="Prix (FCFA)">
                  <Input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    required
                  />
                </Field>
              </div>

              <Field label="Nom du plat">
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Riz sauce graine"
                  required
                />
              </Field>

              <Field label="Description">
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Riz local, sauce graine et poisson fumé"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Portions">
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                  />
                </Field>
                <Field label="Allergènes" hint="séparés par des virgules">
                  <Input
                    value={form.allergens}
                    onChange={(event) => setForm({ ...form, allergens: event.target.value })}
                    placeholder="poisson, arachide"
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.vegetarian}
                  onChange={(event) => setForm({ ...form, vegetarian: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Plat végétarien
              </label>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Publier le plat'}
              </Button>
            </form>
          </Card>
        ) : null}

        <Card className={canWrite ? '' : ''}>
          <SectionTitle>Menus à venir (2 semaines)</SectionTitle>
          {meals.length === 0 ? (
            <Empty title="Aucun plat publié" description="Ajoutez un plat pour ouvrir les réservations." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {meals.map((meal) => (
                <li key={meal.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{meal.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatDay(meal.service_date)} · {fcfa(meal.price)} ·{' '}
                      {meal.reservations?.[0]?.count ?? 0}/{meal.capacity} réservés
                    </p>
                    {meal.allergens?.length ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {meal.allergens.map((allergen) => (
                          <Badge key={allergen} tone="slate">
                            {allergen}
                          </Badge>
                        ))}
                        {meal.vegetarian ? <Badge tone="teal">végétarien</Badge> : null}
                      </div>
                    ) : null}
                  </div>
                  {canWrite ? (
                    <button
                      type="button"
                      onClick={() => remove(meal)}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-coral-700 hover:bg-coral-100"
                    >
                      Supprimer
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
