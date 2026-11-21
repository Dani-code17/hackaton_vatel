import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { addDays, fcfa, formatDay, todayISO } from '../../lib/format'
import MealVisual from '../../components/MealVisual'
import { useLanguage } from '../../i18n/language'
import { Alert, Badge, Button, Card, Empty, Field, Icon, Input, SectionTitle, Select, Spinner, Textarea } from '../../components/ui'

const emptyForm = {
  service_date: todayISO(),
  name: '',
  description: '',
  price: 1500,
  capacity: 150,
  vegetarian: false,
  allergens: '',
  base_label: 'Riz',
  protein_label: '',
  photo_url: '',
}

export default function MenusPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [uploading, setUploading] = useState(false)
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

      const { error } = editingId
        ? await supabase
            .from('meals')
            .update({
              service_date: form.service_date,
              name: form.name.trim(),
              description: form.description.trim() || null,
              price: Number(form.price),
              capacity: Number(form.capacity),
              vegetarian: form.vegetarian,
              allergens,
              base_label: form.base_label || null,
              protein_label: form.protein_label.trim() || null,
              photo_url: form.photo_url || null,
            })
            .eq('id', editingId)
        : await supabase.from('meals').insert({
            school_id: profile.school_id,
            service_date: form.service_date,
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: Number(form.price),
            capacity: Number(form.capacity),
            vegetarian: form.vegetarian,
            allergens,
            base_label: form.base_label || null,
            protein_label: form.protein_label.trim() || null,
            photo_url: form.photo_url || null,
          })
      if (error) throw error
      setForm({ ...emptyForm, service_date: form.service_date })
      setEditingId(null)
      await load()
      setMessage({ tone: 'teal', text: t(editingId ? 'menus.updated' : 'menus.created') })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (meal) => {
    setEditingId(meal.id)
    setMessage(null)
    setForm({
      service_date: meal.service_date,
      name: meal.name,
      description: meal.description ?? '',
      price: meal.price,
      capacity: meal.capacity,
      vegetarian: Boolean(meal.vegetarian),
      allergens: (meal.allergens ?? []).join(', '),
      base_label: meal.base_label ?? 'Riz',
      protein_label: meal.protein_label ?? '',
      photo_url: meal.photo_url ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ ...emptyForm, service_date: form.service_date })
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
        <Alert tone="amber">{t('menus.readOnly')}</Alert>
      ) : null}

      <div className="grid gap-4">
        {canWrite ? (
          <Card>
            <SectionTitle>{t(editingId ? 'menus.edit' : 'menus.add')}</SectionTitle>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('menus.serviceDate')}>
                  <Input
                    type="date"
                    value={form.service_date}
                    onChange={(event) => setForm({ ...form, service_date: event.target.value })}
                    required
                  />
                </Field>
                <Field label={t('menus.price')}>
                  <Input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('menus.base')} hint={t('menus.baseHint')}>
                  <Select
                    value={form.base_label}
                    onChange={(event) => setForm({ ...form, base_label: event.target.value })}
                  >
                    {['Riz', 'Frites', 'Attiéké', 'Aloco', 'Gari'].map((base) => (
                      <option key={base} value={base}>
                        {base}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t('menus.protein')} hint={t('menus.proteinHint')}>
                  <Input
                    value={form.protein_label}
                    onChange={(event) => setForm({ ...form, protein_label: event.target.value })}
                    placeholder="Sauce graine, Poulet, Poisson…"
                  />
                </Field>
              </div>

              <Field label={t('menus.name')}>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Riz sauce graine"
                  required
                />
              </Field>

              <div>
                <p className="mb-1.5 font-display text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
                  {t('menus.photo')}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                    <MealVisual meal={{ ...form, name: form.name || form.base_label }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-2xl bg-brand-100 px-3 font-display text-[11px] font-bold text-brand-900">
                      <Icon name="photo_camera" className="text-[16px]" />
                      {uploading ? t('common.loading') : t('menus.upload')}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={async (event) => {
                          const file = event.target.files?.[0]
                          if (!file) return
                          setUploading(true)
                          try {
                            const ext = file.name.split('.').pop() ?? 'jpg'
                            const path = `${profile.school_id}/${Date.now()}.${ext}`
                            const { error: uploadError } = await supabase.storage
                              .from('meals')
                              .upload(path, file, { upsert: true, contentType: file.type })
                            if (uploadError) throw uploadError
                            const { data: publicUrl } = supabase.storage
                              .from('meals')
                              .getPublicUrl(path)
                            setForm((current) => ({ ...current, photo_url: publicUrl.publicUrl }))
                          } catch (uploadFailure) {
                            setMessage({ tone: 'rose', text: uploadFailure.message })
                          } finally {
                            setUploading(false)
                          }
                        }}
                      />
                    </label>
                    {form.photo_url ? (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, photo_url: '' })}
                        className="ml-2 text-[10px] font-semibold text-coral-700 underline"
                      >
                        {t('menus.removePhoto')}
                      </button>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">{t('menus.photoHint')}</p>
                    )}
                  </div>
                </div>
              </div>

              <Field label={t('menus.description')}>
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Riz local, sauce graine et poisson fumé"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t('menus.portions')}>
                  <Input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                  />
                </Field>
                <Field label={t('menus.allergens')} hint="séparés par des virgules">
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
                {busy
                  ? t('common.loading')
                  : editingId
                    ? t('menus.saveEdit')
                    : t('menus.publish')}
              </Button>
              {editingId ? (
                <Button variant="ghost" className="w-full" onClick={cancelEdit}>
                  {t('common.cancel')}
                </Button>
              ) : null}
            </form>
          </Card>
        ) : null}

        <Card className={canWrite ? '' : ''}>
          <SectionTitle>{t('menus.upcoming')}</SectionTitle>
          {meals.length === 0 ? (
            <Empty title={t('menu.empty')} description="Ajoutez un plat pour ouvrir les réservations." />
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
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(meal)}
                        className="rounded-2xl bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-900 hover:bg-brand-100"
                      >
                        {t('menus.editAction')}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(meal)}
                        className="rounded-2xl px-2 py-1 text-xs font-semibold text-coral-700 hover:bg-coral-100"
                      >
                        {t('menus.deleteAction')}
                      </button>
                    </div>
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
