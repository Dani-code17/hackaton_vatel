import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from './toast'
import { Icon } from '../components/ui'

const TONES = {
  success: { ring: 'ring-emerald-200', icon: 'check_circle', tint: 'text-emerald-600' },
  info: { ring: 'ring-brand-200', icon: 'info', tint: 'text-brand-700' },
  warning: { ring: 'ring-amber-200', icon: 'warning', tint: 'text-amber-600' },
  error: { ring: 'ring-coral-300', icon: 'error', tint: 'text-coral-600' },
}

const DURATION = 3600

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((message, tone = 'success') => {
    if (!message) return
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => dismiss(id), DURATION)
  }, [dismiss])

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message) => push(message, 'success'),
      info: (message) => push(message, 'info'),
      warning: (message) => push(message, 'warning'),
      error: (message) => push(message, 'error'),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed left-1/2 top-3 z-[60] w-full max-w-[430px] -translate-x-1/2 space-y-2 px-4"
      >
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] ?? TONES.success
          return (
            <div
              key={toast.id}
              className={`toast-in pointer-events-auto flex items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(7,42,93,0.18)] ring-1 backdrop-blur ${tone.ring}`}
            >
              <Icon name={tone.icon} className={`text-[18px] ${tone.tint}`} filled />
              <p className="flex-1 text-xs font-semibold text-slate-700">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fermer la notification"
                className="grid h-6 w-6 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100"
              >
                <Icon name="close" className="text-[15px]" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
