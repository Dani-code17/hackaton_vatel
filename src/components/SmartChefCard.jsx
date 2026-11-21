import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../i18n/language'
import { recommendMeal } from '../services/deepseekAI'
import { fcfa } from '../lib/format'
import { Badge, Button, Icon, Skeleton } from './ui'

/**
 * « Vatel Smart Chef IA » — recommandation du plat le plus sûr pour l'élève.
 * L'appel DeepSeek est silencieusement remplacé par le moteur local hors ligne.
 */
export default function SmartChefCard({ meals = [], allergies = [], balance = 0, lang }) {
  const { t } = useLanguage()
  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(true)

  const ask = useCallback(async () => {
    setLoading(true)
    const labels = {
      safe: t('ai.safe', { list: '' }).trim(),
      rating: t('ai.rating', { rating: '' }).replace('★', '').trim(),
      light: t('ai.light'),
    }
    const result = await recommendMeal({
      meals,
      allergies,
      balance,
      lang,
      labels,
    })
    setAdvice(result)
    setLoading(false)
  }, [meals, allergies, balance, lang, t])

  useEffect(() => {
    ask()
  }, [ask])

  if (meals.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl bg-brand-900 text-white shadow-[0_10px_28px_rgba(7,42,93,0.28)]">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-coral-500 text-on-accent">
            <Icon name="auto_awesome" className="text-[19px]" filled />
          </span>
          <div>
            <p className="font-display text-[13px] font-bold leading-tight">{t('ai.chefTitle')}</p>
            <p className="text-[10px] text-white/60">{t('ai.chefSubtitle')}</p>
          </div>
        </div>
        <Badge tone="slate" className="bg-white/15 text-white ring-white/20">
          {advice?.source === 'ia' ? t('ai.sourceAI') : t('ai.sourceLocal')}
        </Badge>
      </div>

      <div className="px-4 pb-4 pt-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-white/20" />
            <Skeleton className="h-6 w-40 bg-white/20" />
            <Skeleton className="h-3 w-full bg-white/15" />
          </div>
        ) : advice ? (
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.1em] text-coral-300">
                  {t('ai.recommended', { score: advice.score })}
                </p>
                <p className="mt-1 truncate font-display text-lg font-bold leading-tight">
                  {advice.name}
                </p>
              </div>
              <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/12">
                <span className="font-display text-[13px] font-extrabold">{advice.score}%</span>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-white/75">{advice.reason}</p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-white/60">
                <Icon name="account_balance_wallet" className="text-[13px]" />
                {t('ai.balance', { amount: fcfa(balance) })}
              </span>
              <Button
                variant="ghost"
                className="h-8 px-2 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                onClick={ask}
              >
                <Icon name="refresh" className="text-[15px]" /> {t('ai.refresh')}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-white/75">{t('ai.noSafeMeal')}</p>
        )}
      </div>
    </div>
  )
}
