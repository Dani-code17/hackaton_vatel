import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatTime } from '../../lib/format'
import { Alert, Badge, Button, Card, Field, Input, SectionTitle, Select, Spinner } from '../../components/ui'

const QUICK_AMOUNTS = [200, 500, 1000, 2000]

const KIND_LABELS = {
  recharge: 'Recharge',
  debit_repas: 'Repas réservé',
  remboursement: 'Remboursement',
}

export default function ComptePage() {
  const { user, profile, refresh } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState(500)
  const [method, setMethod] = useState('wave')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [allergiesInput, setAllergiesInput] = useState((profile?.allergies ?? []).join(', '))
  const [diet, setDiet] = useState(profile?.diet ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) setMessage({ tone: 'rose', text: error.message })
    setTransactions(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const recharge = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('recharge_wallet', {
        p_user_id: user.id,
        p_amount: Number(amount),
        p_method: method,
      })
      if (error) throw error
      await refresh()
      await load()
      setMessage({
        tone: 'teal',
        text: `Recharge de ${fcfa(amount)} confirmée via ${method === 'wave' ? 'Wave' : 'Orange Money'}.`,
      })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    setMessage(null)
    try {
      const allergies = allergiesInput
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)

      const { error } = await supabase
        .from('profiles')
        .update({ allergies, diet: diet.trim() || null })
        .eq('id', user.id)
      if (error) throw error
      await refresh()
      setMessage({ tone: 'teal', text: 'Profil alimentaire enregistré.' })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="bg-gradient-to-br from-teal-700 to-teal-600 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-100">Solde disponible</p>
        <p className="mt-1 text-3xl font-bold">{fcfa(profile?.balance)}</p>
        <p className="mt-1 text-xs text-teal-100">{profile?.full_name}</p>
        {profile?.allergies?.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {profile.allergies.map((allergen) => (
              <span
                key={allergen}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-white/30"
              >
                ⚠ {allergen}
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      <Card>
        <SectionTitle>Mon profil alimentaire</SectionTitle>
        <form onSubmit={saveProfile} className="space-y-3">
          <Field label="Allergies" hint="séparées par des virgules — elles déclenchent une alerte au comptoir">
            <Input
              value={allergiesInput}
              onChange={(event) => setAllergiesInput(event.target.value)}
              placeholder="arachide, poisson"
            />
          </Field>
          <Field label="Régime particulier">
            <Input
              value={diet}
              onChange={(event) => setDiet(event.target.value)}
              placeholder="sans porc, végétarien…"
            />
          </Field>
          <Button type="submit" variant="secondary" className="w-full" disabled={savingProfile}>
            {savingProfile ? 'Enregistrement…' : 'Enregistrer mon profil'}
          </Button>
        </form>
      </Card>

      <Card>
        <SectionTitle>Recharger mon compte</SectionTitle>
        <form onSubmit={recharge} className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={
                  'rounded-xl border px-2 py-2 text-xs font-semibold transition ' +
                  (Number(amount) === value
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300')
                }
              >
                {fcfa(value)}
              </button>
            ))}
          </div>

          <Field label="Montant (FCFA)">
            <input
              type="number"
              min="25"
              step="25"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </Field>

          <Field label="Moyen de paiement">
            <Select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="wave">Wave</option>
              <option value="orange_money">Orange Money</option>
              <option value="especes">Espèces (au comptoir)</option>
            </Select>
          </Field>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Traitement…' : `Recharger ${fcfa(amount)}`}
          </Button>
          <p className="text-center text-[11px] text-slate-400">
            Paiement simulé pour la démonstration
          </p>
        </form>
      </Card>

      <section>
        <SectionTitle>Historique</SectionTitle>
        {loading ? (
          <Spinner />
        ) : transactions.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-500">
            Aucun mouvement pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {KIND_LABELS[transaction.kind] ?? transaction.kind}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(transaction.created_at).toLocaleDateString('fr-FR')} ·{' '}
                    {formatTime(transaction.created_at)}
                    {transaction.reference ? ` · ${transaction.reference}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      'text-sm font-bold ' +
                      (transaction.amount < 0 ? 'text-rose-600' : 'text-teal-700')
                    }
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {fcfa(transaction.amount)}
                  </p>
                  {transaction.method && transaction.method !== 'systeme' ? (
                    <Badge tone="slate">{transaction.method}</Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
