import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { accentOf, modelConfig } from '../lib/models'

export default function SchoolSwitcher() {
  const { profile, refresh } = useAuth()
  const [schools, setSchools] = useState([])
  const [busy, setBusy] = useState(false)

  const canSwitch = ['gerant', 'directeur'].includes(profile?.role)

  useEffect(() => {
    if (!canSwitch) return
    supabase.rpc('list_demo_schools').then(({ data }) => setSchools(data ?? []))
  }, [canSwitch])

  if (!canSwitch) return null

  const current = schools.find((school) => school.id === profile?.school_id)
  const accent = accentOf(current?.model)

  const change = async (event) => {
    const nextId = event.target.value
    if (!nextId || nextId === profile?.school_id) return
    setBusy(true)
    const { error } = await supabase.rpc('switch_active_school', { p_school: nextId })
    if (error) {
      setBusy(false)
      window.alert(error.message)
      return
    }
    await refresh()
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${accent.badge}`}>
        {modelConfig(current?.model).short}
      </span>
      <select
        value={profile?.school_id ?? ''}
        onChange={change}
        disabled={busy || schools.length === 0}
        aria-label="Changer d'établissement"
        className="max-w-[15rem] truncate rounded-xl border border-transparent bg-white px-2 py-1.5 text-xs font-semibold text-brand-900 shadow-sm focus:border-brand-200 focus:outline-none"
      >
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name} — {school.meal_price} F
          </option>
        ))}
      </select>
    </div>
  )
}
