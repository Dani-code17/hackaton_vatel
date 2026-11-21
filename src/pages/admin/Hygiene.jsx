import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Alert, Badge, Button, Card, Empty, Field, SectionTitle, Spinner, Textarea } from '../../components/ui'

const CHECKLIST = [
  'Sols et murs propres',
  'Plats couverts et protégés',
  'Présence de savon et eau',
  'Tenue propre du personnel',
  'Absence de nuisibles',
  'Frigo à température',
]

export default function HygienePage() {
  const { profile, user } = useAuth()
  const [checks, setChecks] = useState(CHECKLIST.map((label) => ({ label, ok: true })))
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const canWrite = profile?.role === 'gerant'
  const score = useMemo(
    () => Math.round((checks.filter((item) => item.ok).length / checks.length) * 100),
    [checks],
  )

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('hygiene_checks')
      .select('id, score, note, photo_path, checked_at, author:profiles(full_name)')
      .order('checked_at', { ascending: false })
      .limit(10)

    if (error) setMessage({ tone: 'rose', text: error.message })
    setHistory(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (index) => {
    setChecks((current) =>
      current.map((item, position) => (position === index ? { ...item, ok: !item.ok } : item)),
    )
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      let photoPath = null

      if (file) {
        const extension = file.name.split('.').pop() || 'jpg'
        photoPath = `${profile.school_id}/${Date.now()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('hygiene-photos')
          .upload(photoPath, file, { contentType: file.type || 'image/jpeg' })
        if (uploadError) throw uploadError
      }

      const { error } = await supabase.from('hygiene_checks').insert({
        school_id: profile.school_id,
        checked_by: user.id,
        checklist: checks,
        score,
        note: note.trim() || null,
        photo_path: photoPath,
      })
      if (error) throw error

      setFile(null)
      setNote('')
      setChecks(CHECKLIST.map((label) => ({ label, ok: true })))
      await load()
      setMessage({ tone: 'teal', text: `Contrôle enregistré (${score}/100).` })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const openPhoto = async (row) => {
    if (!row.photo_path) return
    const { data, error } = await supabase.storage
      .from('hygiene-photos')
      .createSignedUrl(row.photo_path, 120)
    if (error) {
      setMessage({ tone: 'rose', text: error.message })
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <div className="grid gap-4">
        <Card>
          <SectionTitle>Checklist du jour</SectionTitle>
          <form onSubmit={submit} className="space-y-3">
            <ul className="space-y-1.5">
              {checks.map((item, index) => (
                <li key={item.label}>
                  <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                    <span className="text-slate-700">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.ok}
                      onChange={() => toggle(index)}
                      disabled={!canWrite}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xs font-semibold uppercase text-slate-500">Score</span>
              <span
                className={
                  'text-lg font-bold ' +
                  (score >= 80 ? 'text-brand-900' : score >= 50 ? 'text-amber-600' : 'text-coral-700')
                }
              >
                {score}/100
              </span>
            </div>

            <Field label="Photo horodatée du magasin / cuisine">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                disabled={!canWrite}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
              />
            </Field>

            <Field label="Observation">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Tenue de la cantinière à renouveler"
                disabled={!canWrite}
              />
            </Field>

            <Button type="submit" className="w-full" disabled={busy || !canWrite}>
              {busy ? 'Envoi…' : 'Enregistrer le contrôle'}
            </Button>
            {!canWrite ? (
              <p className="text-center text-xs text-slate-400">
                Seul le gérant réalise le contrôle sur site.
              </p>
            ) : null}
          </form>
        </Card>

        <Card>
          <SectionTitle>Historique des contrôles</SectionTitle>
          {history.length === 0 ? (
            <Empty title="Aucun contrôle" description="Le premier contrôle apparaîtra ici." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((row) => (
                <li key={row.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(row.checked_at).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {row.author?.full_name ?? 'Gérant'}
                      </p>
                    </div>
                    <Badge tone={row.score >= 80 ? 'teal' : row.score >= 50 ? 'amber' : 'rose'}>
                      {row.score}/100
                    </Badge>
                  </div>
                  {row.note ? <p className="mt-1 text-xs text-slate-600">{row.note}</p> : null}
                  {row.photo_path ? (
                    <button
                      type="button"
                      onClick={() => openPhoto(row)}
                      className="mt-1 text-xs font-semibold text-brand-900 hover:underline"
                    >
                      📷 Voir la photo horodatée
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
