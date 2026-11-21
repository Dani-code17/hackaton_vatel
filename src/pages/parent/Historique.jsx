import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fcfa, formatTime } from '../../lib/format'
import { useLanguage } from '../../i18n/language'
import { Badge, Empty, Spinner } from '../../components/ui'

export default function HistoriquePage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: kids } = await supabase.from('profiles').select('id, full_name').eq('parent_id', user.id)
    const ids = (kids ?? []).map((kid) => kid.id)
    const names = new Map((kids ?? []).map((kid) => [kid.id, kid.full_name]))

    if (ids.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .in('user_id', ids)
      .order('created_at', { ascending: false })
      .limit(50)

    setRows((data ?? []).map((row) => ({ ...row, childName: names.get(row.user_id) ?? 'Enfant' })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <Spinner />

  if (rows.length === 0) {
    return <Empty title={t('parent.emptyHistory')} description="Les recharges et repas apparaîtront ici." />
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{row.childName}</p>
            <p className="text-[11px] text-slate-400">
              {new Date(row.created_at).toLocaleDateString('fr-FR')} · {formatTime(row.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className={'text-sm font-bold ' + (row.amount < 0 ? 'text-coral-700' : 'text-brand-900')}>
              {row.amount > 0 ? '+' : ''}
              {fcfa(row.amount)}
            </p>
            <Badge tone="slate">{row.kind}</Badge>
          </div>
        </li>
      ))}
    </ul>
  )
}
