import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useUniverse } from '../context/UniverseContext'
import { supabase } from '../lib/supabase'
import { cx } from '../lib/format'
import { UNIVERSE_ORDER, UNIVERSES } from '../lib/universes'

function NineDots() {
  return (
    <span className="grid grid-cols-3 gap-[3px]" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="h-1 w-1 rounded-full bg-current" />
      ))}
    </span>
  )
}

function UniverseCard({ universe, active, disabled, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(universe)}
      disabled={disabled}
      className={cx(
        'group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition',
        active
          ? 'border-brand-900 bg-brand-50 ring-2 ring-brand-900/20'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl"
            style={{ backgroundColor: universe.swatches[2] || '#F4F7FA' }}
          >
            {universe.icon}
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{universe.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {universe.tagline}
            </p>
          </div>
        </div>
        {active ? (
          <span className="rounded-full bg-brand-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            Actuel
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-slate-600">{universe.description}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {universe.swatches.map((color) => (
            <span
              key={color}
              className="h-4 w-4 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="ml-1 text-[10px] text-slate-400">{universe.paletteNote}</span>
        </div>
        <span className="text-xs font-semibold text-brand-900 opacity-0 transition group-hover:opacity-100">
          Ouvrir →
        </span>
      </div>
    </button>
  )
}

export default function AppSwitcher() {
  const { profile } = useAuth()
  const { universe: current } = useUniverse()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState(null)

  const canSwitch = ['gerant', 'directeur'].includes(profile?.role)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape' && !pending) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, pending])

  if (!canSwitch) return null

  const select = async (target) => {
    if (target.id === current) {
      setOpen(false)
      return
    }

    setError(null)
    setPending(target)

    try {
      const { data: schools, error: listError } = await supabase.rpc('list_demo_schools')
      if (listError) throw listError

      const school = (schools ?? []).find((row) => row.model === target.model)
      if (!school) throw new Error("Cet univers n'est pas disponible pour votre compte.")

      const { error: switchError } = await supabase.rpc('switch_active_school', {
        p_school: school.id,
      })
      if (switchError) throw switchError

      // Laisser l'écran de transition respirer avant le rechargement complet
      setTimeout(() => window.location.reload(), 900)
    } catch (switchFailure) {
      setPending(null)
      setError(switchFailure.message ?? 'Bascule impossible')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Changer d'univers"
        title="Changer d'univers"
        className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
      >
        <NineDots />
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
              <div className="universe-fade w-full max-w-[430px] rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Super-App
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">Sélecteur d&apos;univers</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Trois cantines, trois façons de travailler.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={Boolean(pending)}
                    className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>

                {error ? (
                  <p className="mt-3 rounded-xl border border-coral-300 bg-coral-100 px-3 py-2 text-xs text-coral-700">
                    {error}
                  </p>
                ) : null}

                <div className="mt-4 space-y-2.5">
                  {UNIVERSE_ORDER.map((id) => (
                    <UniverseCard
                      key={id}
                      universe={UNIVERSES[id]}
                      active={id === current}
                      disabled={Boolean(pending)}
                      onSelect={select}
                    />
                  ))}
                </div>

                <p className="mt-4 text-center text-[11px] text-slate-400">
                  Les données restent cloisonnées par établissement (RLS Supabase).
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}

      {pending
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-white">
              <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              <div className="text-center">
                <p className="text-sm font-semibold">Chargement de l&apos;espace…</p>
                <p className="mt-1 text-xs text-white/60">{pending.name}</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
