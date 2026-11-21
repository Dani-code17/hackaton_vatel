import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/language'
import { predictRations } from '../services/deepseekAI'
import { Badge, Button, Card, Icon, Skeleton } from './ui'

/**
 * « Prédiction IA Anti-Gaspillage » — rations à préparer demain et risques de rupture.
 * L'appel DeepSeek est silencieusement remplacé par le moteur local hors ligne.
 */
export default function StockPredictionCard({ history = [], supplies = [], fallbackHeadcount = 0 }) {
  const { t, lang } = useLanguage()
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const ask = useCallback(async () => {
    requestId.current += 1
    const current = requestId.current
    setLoading(true)
    const result = await predictRations({ history, supplies, lang, fallbackHeadcount })
    // Ignore une réponse obsolète (double rendu, rafraîchissement concurrent)
    if (current !== requestId.current) return
    setForecast(result)
    setLoading(false)
  }, [history, supplies, lang, fallbackHeadcount])

  useEffect(() => {
    ask()
  }, [ask])

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 font-display text-[13px] font-bold uppercase tracking-[0.06em] text-brand-900">
            <Icon name="psychology" className="text-[16px]" filled />
            {t('ai.predictionTitle')}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{t('ai.predictionSubtitle')}</p>
        </div>
        <Badge tone={forecast?.source === 'ia' ? 'navy' : 'slate'}>
          {forecast?.source === 'ia' ? t('ai.sourceAI') : t('ai.sourceLocal')}
        </Badge>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-2xl font-bold tabular-nums text-brand-900">
                {t('ai.predictionValue', { count: forecast?.headcount ?? 0 })}
              </p>
              <p className="text-[10px] text-slate-400">
                {t('ai.confidence', { pct: forecast?.confidence ?? 0 })} ·{' '}
                {t('ai.history', { days: forecast?.days ?? 0 })}
              </p>
            </div>
            <Button variant="ghost" className="h-8 px-2 text-[11px]" onClick={ask}>
              <Icon name="refresh" className="text-[15px]" /> {t('common.refresh')}
            </Button>
          </div>

          {forecast?.risks?.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                {t('ai.riskTitle')}
              </p>
              <ul className="mt-1 space-y-0.5">
                {forecast.risks.slice(0, 3).map((risk) => (
                  <li key={risk.name} className="text-[11px] text-amber-800">
                    {t('ai.riskLine', {
                      name: risk.name,
                      needed: risk.needed,
                      stock: risk.stock,
                      unit: risk.unit,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-700">
              {t('ai.noRisk')}
            </p>
          )}

          {forecast?.note ? (
            <p className="text-[11px] italic leading-relaxed text-slate-500">{forecast.note}</p>
          ) : null}
        </div>
      )}
    </Card>
  )
}
