import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/format'

export default function UserMenu({ light = false }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex items-center gap-1">
      {profile ? (
        <span
          className={
            'hidden text-[11px] font-semibold sm:inline ' +
            (light ? 'text-brand-200' : 'text-slate-500')
          }
        >
          {profile.full_name}
          {profile.full_name !== ROLE_LABELS[profile.role] ? ` · ${ROLE_LABELS[profile.role]}` : ''}
        </span>
      ) : null}
      <button
        type="button"
        onClick={signOut}
        className={
          'rounded-2xl px-2 py-1 text-xs font-semibold transition ' +
          (light
            ? 'text-brand-200 hover:bg-white/10 hover:text-white'
            : 'text-slate-500 hover:bg-slate-100')
        }
        title="Se déconnecter"
      >
        Quitter
      </button>
    </div>
  )
}
