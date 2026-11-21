import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDay, todayISO } from '../../lib/format'
import { Alert, Badge, Button, Card, Field, Input, SectionTitle, Spinner, Stat } from '../../components/ui'

export default function EcolePage() {
  const { profile } = useAuth()
  const [school, setSchool] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ enrolled: 216, present: 200, record_date: todayISO() })

  const canEdit = ['gerant', 'directeur'].includes(profile?.role)
  const canValidate = profile?.role === 'directeur'

  const load = useCallback(async () => {
    setLoading(true)
    const [schoolResult, attendanceResult] = await Promise.all([
      supabase.from('schools').select('*').eq('id', profile.school_id).maybeSingle(),
      supabase
        .from('attendance_records')
        .select('*')
        .order('record_date', { ascending: false })
        .limit(30),
    ])

    if (schoolResult.error) setMessage({ tone: 'rose', text: schoolResult.error.message })
    setSchool(schoolResult.data)
    setAttendance(attendanceResult.data ?? [])
    if (schoolResult.data) {
      setForm((current) => ({ ...current, enrolled: schoolResult.data.enrolled_count }))
    }
    setLoading(false)
  }, [profile.school_id])

  useEffect(() => {
    load()
  }, [load])

  const saveAttendance = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.from('attendance_records').upsert(
        {
          school_id: profile.school_id,
          record_date: form.record_date,
          enrolled: Number(form.enrolled),
          present: Number(form.present),
          created_by: profile.id,
        },
        { onConflict: 'school_id,record_date' },
      )
      if (error) throw error

      await supabase
        .from('schools')
        .update({ enrolled_count: Number(form.enrolled) })
        .eq('id', profile.school_id)

      await load()
      setMessage({ tone: 'teal', text: 'Fiche d’assiduité enregistrée.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const validate = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase
        .from('schools')
        .update({ validated_at: new Date().toISOString(), validated_by: profile.id })
        .eq('id', profile.school_id)
      if (error) throw error
      await load()
      setMessage({ tone: 'teal', text: 'Fiche école validée et signée.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const exportCsv = () => {
    const header = 'date;inscrits;presents;taux\n'
    const lines = attendance
      .map(
        (row) =>
          `${row.record_date};${row.enrolled};${row.present};${
            row.enrolled ? Math.round((row.present / row.enrolled) * 100) : 0
          }%`,
      )
      .join('\n')
    const blob = new Blob([header + lines], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `assiduite-${profile.school_id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <Spinner />

  const lastAttendance = attendance[0]
  const rate = lastAttendance?.enrolled
    ? Math.round((lastAttendance.present / lastAttendance.enrolled) * 100)
    : 0

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Effectif" value={school?.enrolled_count ?? 0} />
        <Stat label="Taux de présence" value={`${rate}%`} tone="teal" />
        <Stat
          label="Validation"
          value={school?.validated_at ? 'Signée' : 'En attente'}
          tone={school?.validated_at ? 'teal' : 'amber'}
        />
      </div>

      <div className="grid gap-4">
        <Card>
          <SectionTitle>Fiche école</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Établissement</dt>
              <dd className="font-semibold text-slate-800">{school?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Ville</dt>
              <dd className="font-medium text-slate-700">{school?.city}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Directeur</dt>
              <dd className="font-medium text-slate-700">{school?.director_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Effectif saisi</dt>
              <dd className="font-medium text-slate-700">{school?.enrolled_count}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-slate-100 pt-3">
            {school?.validated_at ? (
              <Badge tone="teal">
                ✓ Validée le {new Date(school.validated_at).toLocaleDateString('fr-FR')}
              </Badge>
            ) : canValidate ? (
              <Button variant="secondary" className="w-full" disabled={busy} onClick={validate}>
                Signer la fiche école
              </Button>
            ) : (
              <p className="text-xs text-amber-600">En attente de la signature du directeur.</p>
            )}
          </div>

          <Button variant="ghost" className="mt-2 w-full text-xs" onClick={exportCsv}>
            ⤓ Exporter l&apos;assiduité (CSV)
          </Button>
        </Card>

        <Card>
          <SectionTitle>Fiche d&apos;assiduité du jour</SectionTitle>
          <form onSubmit={saveAttendance} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input
                  type="date"
                  value={form.record_date}
                  onChange={(event) => setForm({ ...form, record_date: event.target.value })}
                  required
                />
              </Field>
              <Field label="Inscrits">
                <Input
                  type="number"
                  min="0"
                  value={form.enrolled}
                  onChange={(event) => setForm({ ...form, enrolled: event.target.value })}
                  required
                />
              </Field>
            </div>
            <Field label="Présents">
              <Input
                type="number"
                min="0"
                value={form.present}
                onChange={(event) => setForm({ ...form, present: event.target.value })}
                required
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy || !canEdit}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>

          <ul className="mt-4 divide-y divide-slate-100 text-xs">
            {attendance.slice(0, 5).map((row) => (
              <li key={row.id} className="flex items-center justify-between py-1.5">
                <span className="text-slate-600">{formatDay(row.record_date)}</span>
                <span className="font-semibold text-slate-800">
                  {row.present}/{row.enrolled}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
