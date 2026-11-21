import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/toast'
import { supabase } from '../../lib/supabase'
import { addDays, cx, fcfa, formatDay, todayISO } from '../../lib/format'
import { allergyConflicts } from '../../lib/business'
import { useLanguage } from '../../i18n/language'
import SmartChefCard from '../../components/SmartChefCard'
import { Alert, Badge, Button, Card, Empty, Icon, Spinner } from '../../components/ui'

const CACHE_KEY = 'cantine:menus'

function readCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeCache(meals) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(meals))
  } catch {
    // quota dépassé : le cache est un confort, pas un prérequis
  }
}

export default function MenuPage() {
  const { user, profile, refresh } = useAuth()
  const { t, lang, locale } = useLanguage()
  const toast = useToast()
  const [meals, setMeals] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)
  const [filter, setFilter] = useState('all')
  const [offer, setOffer] = useState(null)

  const today = todayISO()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const weekEnd = addDays(today, 6)
    const [mealsResult, reservationsResult, offersResult] = await Promise.all([
      supabase
        .from('meals')
        .select('*')
        .gte('service_date', today)
        .lte('service_date', weekEnd)
        .order('service_date')
        .order('name'),
      supabase
        .from('reservations')
        .select('id, meal_id, status')
        .eq('user_id', user.id)
        .neq('status', 'annulee'),
      supabase
        .from('flash_offers')
        .select('discount_pct, ends_at')
        .eq('service_date', today)
        .is('closed_at', null)
        .gt('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    if (mealsResult.error) {
      const cached = readCache()
      if (cached.length > 0) {
        setMeals(cached)
        setMessage({ tone: 'amber', text: 'Hors ligne : menu affiché depuis le cache local.' })
      } else {
        setMessage({ tone: 'rose', text: mealsResult.error.message })
      }
    } else {
      setMeals(mealsResult.data)
      writeCache(mealsResult.data)
    }

    setReservations(reservationsResult.data ?? [])
    setOffer(offersResult.data?.[0] ?? null)
    setLoading(false)
  }, [today, user])

  useEffect(() => {
    load()
  }, [load])

  const reservedIds = useMemo(
    () => new Set(reservations.filter((r) => r.status !== 'annulee').map((r) => r.meal_id)),
    [reservations],
  )

  const myAllergies = useMemo(
    () => (profile?.allergies ?? []).map((a) => a.toLowerCase()),
    [profile?.allergies],
  )
  const openCount = reservations.filter((r) => r.status === 'reservee').length

  const filtered = useMemo(() => {
    if (filter === 'today') return meals.filter((meal) => meal.service_date === today)
    if (filter === 'veg') return meals.filter((meal) => meal.vegetarian)
    return meals
  }, [filter, meals, today])

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const meal of filtered) {
      if (!groups.has(meal.service_date)) groups.set(meal.service_date, [])
      groups.get(meal.service_date).push(meal)
    }
    return [...groups.entries()]
  }, [filtered])

  const reserve = async (meal) => {
    setBusyId(meal.id)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('reserve_meal', { p_meal_id: meal.id })
      if (error) throw error
      await refresh()
      await load()
      toast.success(t('menu.reservedToast', { name: meal.name }))
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Spinner />

  const firstName = (profile?.full_name ?? '').split(' ')[0]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-coral-500">
            {t('menu.sessionActive')}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-brand-900">
            {t('menu.greeting', { name: firstName })}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{t('menu.subtitle')}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-100 font-display text-sm font-bold text-brand-900 ring-1 ring-brand-200">
          {(profile?.full_name ?? 'V')
            .split(' ')
            .slice(0, 2)
            .map((part) => part[0])
            .join('')}
        </span>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
              {t('menu.balance')}
            </p>
            <p className="mt-1 font-display text-3xl font-bold tracking-tight text-brand-900">
              {fcfa(profile?.balance)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t('menu.secureTopUp')}</p>
          </div>
          <Badge tone="teal">
            {t(openCount > 1 ? 'menu.mealsLeftPlural' : 'menu.mealsLeft', { count: openCount })}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/eleve/compte"
            className="flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 py-2 font-display text-[11px] font-semibold text-brand-900"
          >
            <Icon name="waves" className="text-[16px]" /> {t('menu.wave')}
          </Link>
          <Link
            to="/eleve/compte"
            className="flex items-center justify-center gap-2 rounded-lg border border-coral-200 bg-coral-100 py-2 font-display text-[11px] font-semibold text-coral-700"
          >
            <Icon name="phone_iphone" className="text-[16px]" /> {t('menu.orangeMoney')}
          </Link>
        </div>
      </Card>

      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {profile && profile.balance < 50 ? (
        <Alert tone="amber" title={t('menu.lowBalance')}>
          {t('menu.lowBalanceHint', { amount: fcfa(profile.balance) })}
        </Alert>
      ) : null}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex min-w-0 items-center gap-1.5 font-display text-[17px] font-bold leading-tight text-brand-900">
            <Icon name="restaurant" className="shrink-0 text-[18px]" />
            <span className="truncate">{t('menu.title')}</span>
          </h2>
          <span className="shrink-0 whitespace-nowrap font-display text-[10px] font-bold uppercase tracking-[0.08em] text-coral-500">
            {t('menu.service')}
          </span>
        </div>

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {[
            { id: 'all', label: t('menu.filterAll') },
            { id: 'today', label: t('menu.filterToday'), dot: true },
            { id: 'veg', label: t('menu.filterVeg') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cx(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-[11px] font-semibold transition',
                filter === item.id
                  ? 'bg-brand-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600',
              )}
            >
              {item.dot ? (
                <span className="h-1.5 w-1.5 rounded-full bg-coral-500" aria-hidden="true" />
              ) : null}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {grouped.length === 0 ? (
        <Empty title={t('menu.empty')} description={t('menu.emptyHint')} />
      ) : null}

      {offer ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-coral-500 px-4 py-2.5 text-on-accent shadow-[0_8px_20px_rgba(255,89,89,0.24)]">
          <div className="min-w-0">
            <p className="font-display text-[12px] font-bold leading-tight">
              {t('flash.banner', { pct: offer.discount_pct })}
            </p>
            <p className="text-[10px] opacity-90">
              {t('flash.bannerUntil', {
                time: new Date(offer.ends_at).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
          </div>
          <Icon name="percent" className="shrink-0 text-[22px]" filled />
        </div>
      ) : null}

      <SmartChefCard meals={filtered} allergies={profile?.allergies ?? []} balance={profile?.balance} lang={lang} />

      {grouped.map(([date, dayMeals]) => (
        <section key={date} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {formatDay(date)}
            </h3>
            {date === today ? <Badge tone="rose">Aujourd&apos;hui</Badge> : null}
          </div>

          {dayMeals.map((meal) => {
            const reserved = reservedIds.has(meal.id)
            const conflicts = allergyConflicts(meal.allergens, myAllergies)
            const discountPct = offer && meal.service_date === today ? offer.discount_pct : 0
            const payablePrice = Math.round((meal.price * (100 - discountPct)) / 100)

            return (
              <Card key={meal.id} className="overflow-hidden">
                <div className="relative h-20 bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="restaurant" className="text-[40px] text-white/25" filled />
                  </div>
                  <div className="absolute right-2 top-2 flex flex-wrap justify-end gap-1">
                    {meal.vegetarian ? <Badge tone="sky">{t('menu.vegetarian')}</Badge> : null}
                    {discountPct > 0 ? <Badge tone="amber">−{discountPct} %</Badge> : null}
                    {conflicts.length > 0 ? (
                      <Badge tone="rose">⚠ {t('menu.allergen')}</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-display text-base font-bold leading-snug text-brand-900">
                    {meal.name}
                  </h4>
                  {meal.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{meal.description}</p>
                  ) : null}

                  {meal.allergens.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {meal.allergens.map((allergen) => (
                        <Badge key={allergen} tone="slate">
                          {allergen}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {conflicts.length > 0 ? (
                    <div className="mt-2">
                      <Alert tone="rose">
                        {t('menu.allergyWarning', { list: conflicts.join(', ') })}
                      </Alert>
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        {t('menu.studentPrice')}
                      </p>
                      <p className="font-display text-lg font-bold tabular-nums text-brand-900">
                        {fcfa(payablePrice)}
                        {discountPct > 0 ? (
                          <span className="ml-1.5 text-[11px] font-semibold text-slate-400 line-through">
                            {fcfa(meal.price)}
                          </span>
                        ) : null}
                      </p>
                    </div>

                    {reserved ? (
                      <span className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-brand-50 px-3 font-display text-[12px] font-semibold text-brand-900">
                        <Icon name="check_circle" className="text-[17px]" /> {t('menu.reserved')}
                      </span>
                    ) : (
                      <Button
                        className="h-11 px-3 text-[12px]"
                        disabled={busyId === meal.id || profile?.balance < payablePrice}
                        onClick={() => reserve(meal)}
                      >
                        {busyId === meal.id
                          ? t('common.loading')
                          : profile?.balance < payablePrice
                            ? t('menu.insufficientBalance')
                            : t('menu.reserve')}
                        {busyId === meal.id ? null : (
                          <Icon name="arrow_forward" className="text-[16px]" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </section>
      ))}
    </div>
  )
}