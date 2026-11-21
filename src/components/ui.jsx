import { cx } from '../lib/format'

export function Icon({ name, className = '', filled = false }) {
  return (
    <span
      aria-hidden="true"
      className={cx('material-symbols-outlined', filled && 'icon-filled', className)}
      style={{ fontSize: 'inherit' }}
    >
      {name}
    </span>
  )
}

export function Card({ className = '', children }) {
  return (
    <div
      className={cx(
        'rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(7,42,93,0.04)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

const BUTTON_VARIANTS = {
  primary:
    'bg-coral-500 text-on-accent shadow-[0_6px_18px_rgba(255,103,91,0.28)] hover:bg-coral-600 active:scale-[0.98]',
  navy: 'bg-brand-900 text-white shadow-[0_6px_18px_rgba(7,42,93,0.22)] hover:bg-brand-700 active:scale-[0.98]',
  secondary: 'border-[1.5px] border-brand-900 bg-white text-brand-900 hover:bg-brand-50',
  ghost: 'text-slate-500 hover:bg-slate-100',
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
        'inline-flex h-12 items-center justify-center gap-2 rounded-lg px-4 font-display text-[13px] font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
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
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  teal: 'bg-brand-100 text-brand-900 ring-1 ring-brand-200',
  sky: 'bg-brand-100/70 text-brand-900 ring-1 ring-brand-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  rose: 'bg-coral-100 text-coral-500 ring-1 ring-coral-300',
  navy: 'bg-brand-900 text-white',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
}

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 font-display text-[10px] font-semibold uppercase tracking-[0.06em]',
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
      <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-[0.09em] text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  )
}

const CONTROL =
  'h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-200/60'

export function Input({ className = '', ...props }) {
  return <input className={cx(CONTROL, className)} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={cx(CONTROL, 'appearance-none pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={cx(CONTROL, 'h-auto min-h-20 py-2.5', className)}
      {...props}
    />
  )
}

export function Empty({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <p className="font-display text-sm font-semibold text-slate-700">{title}</p>
      {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}

export function Spinner({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-coral-500" />
      {label}
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'slate', icon }) {
  const tones = {
    slate: 'text-brand-900',
    teal: 'text-brand-900',
    amber: 'text-amber-600',
    rose: 'text-coral-500',
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_2px_8px_rgba(7,42,93,0.04)]">
      <div className="flex items-center gap-1.5">
        {icon ? <Icon name={icon} className="text-[15px] text-slate-400" /> : null}
        <p className="font-display text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </p>
      </div>
      <p className={cx('mt-1 font-display text-xl font-bold tabular-nums', tones[tone])}>{value}</p>
      {hint ? <p className="text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function Alert({ tone = 'teal', title, children }) {
  const tones = {
    teal: 'border-brand-200 bg-brand-50 text-brand-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-coral-200 bg-coral-100 text-coral-700',
  }
  return (
    <div className={cx('rounded-xl border px-3 py-2.5 text-xs', tones[tone])}>
      {title ? <p className="font-display font-bold uppercase tracking-wide">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.06em] text-brand-900">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={cx('skeleton rounded-lg bg-slate-200/80', className)} />
}