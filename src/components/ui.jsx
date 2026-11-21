import { cx } from '../lib/format'

export function Card({ className = '', children }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700',
  teal: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  sky: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
}

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

const CONTROL =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100'

export function Input({ className = '', ...props }) {
  return <input className={cx(CONTROL, className)} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={cx(CONTROL, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={cx(CONTROL, 'min-h-20', className)} {...props} />
}

export function Empty({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}

export function Spinner({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
      {label}
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    teal: 'text-teal-700',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('mt-1 text-xl font-bold', tones[tone])}>{value}</p>
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function Alert({ tone = 'teal', title, children }) {
  const tones = {
    teal: 'border-teal-200 bg-teal-50 text-teal-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
  }
  return (
    <div className={cx('rounded-xl border p-3 text-sm', tones[tone])}>
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{children}</h2>
      {action}
    </div>
  )
}
