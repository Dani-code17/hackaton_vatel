import { cx } from '../lib/format'

export function Card({ className = '', children }) {
  return (
    <div className={cx('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary: 'bg-coral-500 text-on-accent hover:bg-coral-600 active:bg-coral-600 shadow-sm',
  secondary: 'bg-brand-50 text-brand-900 hover:bg-brand-100',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-coral-700 text-white hover:bg-coral-700',
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
  teal: 'bg-brand-50 text-brand-900 ring-1 ring-brand-200',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  rose: 'bg-coral-100 text-coral-700 ring-1 ring-coral-300',
  sky: 'bg-brand-50 text-brand-900 ring-1 ring-brand-200',
}

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
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
  'placeholder:text-slate-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100'

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
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
      {label}
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-900',
    teal: 'text-brand-900',
    amber: 'text-amber-600',
    rose: 'text-coral-700',
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
    teal: 'border-brand-200 bg-brand-50 text-brand-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-coral-300 bg-coral-100 text-coral-700',
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
      <h2 className="text-sm font-bold uppercase tracking-wide text-brand-900">{children}</h2>
      {action}
    </div>
  )
}
