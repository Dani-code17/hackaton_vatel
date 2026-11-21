import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { addDays, fcfa, formatDay, todayISO } from '../../lib/format'
import { Alert, Badge, Button, Card, Empty, SectionTitle, Spinner } from '../../components/ui'

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
  const [meals, setMeals] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [message, setMessage] = useState(null)

  const today = todayISO()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const weekEnd = addDays(today, 6)
    const [mealsResult, reservationsResult] = await Promise.all([
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
    ])

    if (mealsResult.error) {
      const cached = readCache()
      if (cached.length > 0) {
        setMeals(cached)
        setMessage({
          tone: 'amber',
          text: 'Hors ligne : menu affiché depuis le cache local.',
        })
      } else {
        setMessage({ tone: 'rose', text: mealsResult.error.message })
      }
    } else {
      setMeals(mealsResult.data)
      writeCache(mealsResult.data)
    }

    setReservations(reservationsResult.data ?? [])
    setLoading(false)
  }, [today, user])

  useEffect(() => {
    load()
  }, [load])

  const reservedIds = useMemo(
    () => new Set(reservations.filter((r) => r.status !== 'annulee').map((r) => r.meal_id)),
    [reservations],
  )

  const breadcrumbByDay = useMemo(() => {
    const groups = new Map()
    for (const meal of meals) {
      if (!groups.has(meal.service_date)) groups.set(meal.service_date, [])
      groups.get(meal.service_date).push(meal)
    }
    return [...groups.entries()]
  }, [meals])

  const myAllergies = (profile?.allergies ?? []).map((a) => a.toLowerCase())

  const reserve = async (meal) => {
    setBusyId(meal.id)
    setMessage(null)
    try {
      const { error } = await supabase.rpc('reserve_meal', { p_meal_id: meal.id })
      if (error) throw error
      await refresh()
      await load()
      setMessage({ tone: 'teal', text: `Repas réservé : ${meal.name}` })
    } catch (error) {
      setMessage({ tone: 'rose', text: error.message })
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

      {profile && profile.balance < 50 ? (
        <Alert tone="amber" title="Solde bas">
          Il reste {fcfa(profile.balance)}. Pensez à recharger pour réserver les prochains repas.
        </Alert>
      ) : null}

      {breadcrumbByDay.length === 0 ? (
        <Empty
          title="Aucun menu publié"
          description="Le gérant n'a pas encore publié les plats de la semaine."
        />
      ) : null}

      {breadcrumbByDay.map(([date, dayMeals]) => (
        <section key={date} className="space-y-2">
          <SectionTitle
            action={
              date === today ? <Badge tone="teal">Aujourd&apos;hui</Badge> : null
            }
          >
            {formatDay(date)}
          </SectionTitle>

          {dayMeals.map((meal) => {
            const reserved = reservedIds.has(meal.id)
            const conflicts = meal.allergens.filter((a) => myAllergies.includes(a.toLowerCase()))
            const full = (meal._count ?? 0) >= meal.capacity

            return (
              <Card key={meal.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{meal.name}</h3>
                    <p className="text-xs text-slate-500">{meal.description}</p>
                  </div>
                  <p className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-sm font-bold text-slate-800">
                    {fcfa(meal.price)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {meal.vegetarian ? <Badge tone="teal">Végétarien</Badge> : null}
                  {meal.allergens.map((allergen) => (
                    <Badge key={allergen} tone="slate">
                      {allergen}
                    </Badge>
                  ))}
                  {conflicts.length > 0 ? <Badge tone="rose">⚠ Allergie</Badge> : null}
                </div>

                {conflicts.length > 0 ? (
                  <Alert tone="rose">
                    Ce plat contient : {conflicts.join(', ')}. Signalé dans votre profil.
                  </Alert>
                ) : null}

                {reserved ? (
                  <Button variant="secondary" className="w-full" disabled>
                    ✓ Déjà réservé
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={busyId === meal.id || full || profile?.balance < meal.price}
                    onClick={() => reserve(meal)}
                  >
                    {busyId === meal.id
                      ? 'Réservation…'
                      : profile?.balance < meal.price
                        ? 'Solde insuffisant'
                        : 'Réserver ce repas'}
                  </Button>
                )}
              </Card>
            )
          })}
        </section>
      ))}
    </div>
  )
}
