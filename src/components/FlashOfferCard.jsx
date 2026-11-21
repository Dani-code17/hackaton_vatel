import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/toast'
import { useLanguage } from '../i18n/language'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/format'
import { suggestFlashOffer } from '../services/deepseekAI'
import { Badge, Button, Card, Icon, SectionTitle, Skeleton } from './ui'

const DURATIONS = [30, 60, 90]

/**
 * Offre de fin de service : le modèle propose une remise pour écouler les
 * portions restantes, le gérant la publie, les élèves la voient dans le menu.
 */
export default function FlashOfferCard({ onPublished }) {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const toast = useToast()
  const [offer, setOffer] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const [minutes, setMinutes] = useState(60)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const today = todayISO()
  const canWrite = ['gerant', 'directeur'].includes(profile?.role)

  const load = useCallback(async () => {
    setLoading(true)
    const [mealsResult, reservationsResult, offersResult] = await Promise.all([
      supabase
        .from('meals')
        .select('id, name, price, capacity')
        .eq('school_id', profile.school_id)
        .eq('service_date', today),
      supabase
        .from('reservations')
        .select('meal_id, status, meal:meals!inner(service_date)')
        .eq('meal.service_date', today),
      supabase
        .from('flash_offers')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('service_date', today)
        .is('closed_at', null)
        .gt('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    const counts = {}
    for (const row of reservationsResult.data ?? []) {
      if (row.status === 'annulee') continue
      counts[row.meal_id] = (counts[row.meal_id] ?? 0) + 1
    }

    setOffer(offersResult.data?.[0] ?? null)
    setSuggestion(
      await suggestFlashOffer({ meals: mealsResult.data ?? [], reservedByMeal: counts }),
    )
    setLoading(false)
  }, [profile.school_id, today])

  useEffect(() => {
    if (profile?.school_id) load()
  }, [load, profile?.school_id])

  const publish = async () => {
    if (!suggestion) return
    setBusy(true)
    try {
      const { error } = await supabase.from('flash_offers').insert({
        school_id: profile.school_id,
        service_date: today,
        discount_pct: suggestion.discountPct,
        ends_at: new Date(Date.now() + minutes * 60_000).toISOString(),
        note: suggestion.message,
        created_by: profile.id,
      })
      if (error) throw error
      toast.success(t('flash.publishedToast', { pct: suggestion.discountPct }))
      await load()
      onPublished?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const close = async () => {
    if (!offer) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('flash_offers')
        .update({ closed_at: new Date().toISOString() })
        .eq('id', offer.id)
      if (error) throw error
      toast.info(t('flash.closedToast'))
      await load()
      onPublished?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (!canWrite) return null

  return (
    <Card className="p-4">
      <SectionTitle
        action={
          <Badge tone={suggestion?.source === 'ia' ? 'navy' : 'slate'}>
            {suggestion?.source === 'ia' ? t('ai.sourceAI') : t('ai.sourceLocal')}
          </Badge>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Icon name="percent" className="text-[15px]" filled />
          {t('flash.title')}
        </span>
      </SectionTitle>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      ) : offer ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-display text-2xl font-bold text-brand-900">−{offer.discount_pct} %</p>
              <p className="text-[11px] text-slate-500">
                {t('flash.activeUntil', {
                  time: new Date(offer.ends_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
            </div>
            <Badge tone="teal">{t('flash.active')}</Badge>
          </div>
          {offer.note ? <p className="text-[11px] italic text-slate-500">{offer.note}</p> : null}
          <Button variant="secondary" className="w-full" disabled={busy} onClick={close}>
            {t('flash.close')}
          </Button>
        </div>
      ) : suggestion ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="font-display text-2xl font-bold text-brand-900">
                −{suggestion.discountPct} %
              </p>
              <p className="text-[11px] text-slate-500">
                {t('flash.remaining', {
                  remaining: suggestion.remaining,
                  capacity: suggestion.capacity,
                })}
              </p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-coral-100 text-coral-500">
              <Icon name="savings" className="text-[20px]" filled />
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">{suggestion.message}</p>

          <div className="flex gap-1.5">
            {DURATIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMinutes(value)}
                className={
                  'h-9 flex-1 rounded-xl font-display text-[11px] font-semibold transition ' +
                  (minutes === value ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600')
                }
              >
                {t('flash.duration', { count: value })}
              </button>
            ))}
          </div>

          <Button className="w-full" disabled={busy} onClick={publish}>
            <Icon name="bolt" className="text-[17px]" />
            {t('flash.publish', { pct: suggestion.discountPct })}
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">{t('flash.noMeal')}</p>
      )}
    </Card>
  )
}
