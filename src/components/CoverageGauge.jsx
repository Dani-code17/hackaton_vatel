import { cx } from '../lib/format'
import { ACCENTS } from '../lib/models'

export default function CoverageGauge({ current, projected, target, accent = 'teal', note }) {
  const palette = ACCENTS[accent] ?? ACCENTS.teal
  const safeTarget = Math.max(1, target ?? 120)
  const currentPct = Math.min(100, Math.round((current / safeTarget) * 100))
  const projectedPct = Math.min(100, Math.round((projected / safeTarget) * 100))
  const gain = Math.max(0, projected - current)

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-slate-900">
          {current}
          <span className="text-sm font-medium text-slate-400">/{safeTarget} jours</span>
        </p>
        <p className={cx('text-xs font-semibold', palette.text)}>
          Projection {projected}/{safeTarget}
          {gain > 0 ? ` (+${gain} jours)` : ''}
        </p>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cx('absolute inset-y-0 left-0 rounded-full', palette.soft)}
          style={{ width: `${projectedPct}%` }}
        />
        <div
          className={cx('absolute inset-y-0 left-0 rounded-full', palette.bar)}
          style={{ width: `${currentPct}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-slate-500">
        <span>Couverture constatée</span>
        <span>Optimisation des stocks</span>
      </div>

      {note ? <p className="text-[11px] text-slate-400">{note}</p> : null}
    </div>
  )
}
