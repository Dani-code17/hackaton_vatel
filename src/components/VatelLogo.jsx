import { cx } from '../lib/format'

export default function VatelLogo({ compact = false, light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cx(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-coral-500 text-sm font-extrabold text-on-accent',
          compact && 'h-7 w-7 text-xs',
        )}
      >
        V
      </span>
      <div className="leading-tight">
        <p
          className={cx(
            'font-extrabold uppercase tracking-[0.2em]',
            compact ? 'text-[11px]' : 'text-xs',
            light ? 'text-white' : 'text-brand-900',
          )}
        >
          Vatel
        </p>
        <p className={cx('text-[10px] font-medium', light ? 'text-brand-200' : 'text-slate-500')}>
          Cantine Campus Abidjan
        </p>
      </div>
    </div>
  )
}
