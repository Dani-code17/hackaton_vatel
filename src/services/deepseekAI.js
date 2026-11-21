import {
  allergyConflicts,
  forecastHeadcount,
  lowStockRisks,
} from '../lib/business'

const ENDPOINT = 'https://api.deepseek.com/chat/completions'
const MODEL = 'deepseek-chat'
const TIMEOUT_MS = 12000

export const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY ?? ''
export const isDeepSeekEnabled = () => Boolean(deepseekKey)

/** Extrait un objet JSON même si le modèle l'entoure de texte ou de balises. */
function parseJsonObject(raw) {
  if (!raw) return null
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function askDeepSeek({ system, user }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`)

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    const parsed = parseJsonObject(content)
    if (!parsed) throw new Error('Réponse DeepSeek illisible')
    return parsed
  } finally {
    clearTimeout(timer)
  }
}

const clampScore = (value, fallback = 90) => {
  const score = Math.round(Number(value))
  if (!Number.isFinite(score)) return fallback
  return Math.min(99, Math.max(50, score))
}

/**
 * Recommandation locale : reproduit la logique d'un conseiller — on écarte
 * d'abord les plats dangereux, puis on valorise la note et le budget.
 */
export function localMealAdvice({ meals = [], allergies = [], balance = 0, labels }) {
  const rated = meals.map((meal) => {
    const conflicts = allergyConflicts(meal.allergens ?? [], allergies)
    const rating = Number(meal.avg_rating ?? meal.rating ?? 0)

    let score = 92
    if (meal.vegetarian) score += 2
    if (rating >= 4.5) score += 4
    else if (rating >= 4) score += 2
    if (Number(meal.price) > Number(balance)) score -= 30
    if ((meal.allergens ?? []).length > 0 && conflicts.length === 0) score -= 1

    return { meal, conflicts, rating, score }
  })

  const safe = rated.filter((entry) => entry.conflicts.length === 0)
  const pool = safe.length > 0 ? safe : rated
  const best = pool.sort((a, b) => b.score - a.score || b.rating - a.rating)[0]

  if (!best) return null

  const parts = []
  if (safe.length > 0 && allergies.length > 0) {
    parts.push(`${labels.safe} ${allergies.join(', ')}`)
  }
  if (best.rating > 0) parts.push(`${labels.rating} ${best.rating.toFixed(1)}★`)
  if (best.meal.vegetarian) parts.push(labels.light)

  return {
    source: 'local',
    mealId: best.meal.id,
    name: best.meal.name,
    score: clampScore(best.score),
    reason: parts.join(' · ') || labels.light,
    safe: safe.length > 0,
  }
}

/**
 * Recommande le plat le plus sûr pour l'utilisateur connecté.
 * Bascule silencieusement sur le moteur local si l'API est absente ou en échec.
 */
export async function recommendMeal({ meals = [], allergies = [], balance = 0, lang = 'fr', labels }) {
  const fallback = localMealAdvice({ meals, allergies, balance, labels })
  if (!isDeepSeekEnabled() || meals.length === 0) return fallback

  const system =
    'Tu es le chef de cantine de Vatel Abidjan. Tu recommandes un seul plat en respectant ' +
    'strictement les allergies déclarées. Réponds uniquement en JSON: ' +
    '{"mealId":"<id exact>","score":<50-99>,"reason":"<max 90 caractères>"}.'
  const user = JSON.stringify({
    langue: lang,
    allergies,
    solde: balance,
    plats: meals.map((meal) => ({
      id: meal.id,
      nom: meal.name,
      allergenes: meal.allergens ?? [],
      prix: meal.price,
      note: meal.avg_rating ?? meal.rating ?? null,
      vegetarien: Boolean(meal.vegetarian),
    })),
  })

  try {
    const answer = await askDeepSeek({ system, user })
    const chosen = meals.find((meal) => meal.id === answer.mealId)
    if (!chosen) throw new Error('Plat inconnu renvoyé par l’IA')
    if (allergyConflicts(chosen.allergens ?? [], allergies).length > 0) {
      throw new Error('L’IA a proposé un plat allergène')
    }

    return {
      source: 'ia',
      mealId: chosen.id,
      name: chosen.name,
      score: clampScore(answer.score, fallback?.score),
      reason: String(answer.reason ?? fallback?.reason ?? '').slice(0, 120),
      safe: true,
    }
  } catch {
    return fallback
  }
}

/** Prévision locale : moyenne pondérée de l'historique + détection des ruptures. */
export function localRationForecast({ history = [], supplies = [], fallbackHeadcount = 0 }) {
  const headcount = forecastHeadcount(history) || Math.round(Number(fallbackHeadcount) || 0)
  const risks = lowStockRisks({ headcount, supplies })
  const served = history.map((entry) => Number(entry?.served ?? entry) || 0).filter(Boolean)
  const average = served.length > 0 ? served.reduce((sum, v) => sum + v, 0) / served.length : 0
  const spread = average > 0 ? Math.min(1, Math.abs(headcount - average) / average) : 0.4

  return {
    source: 'local',
    headcount,
    confidence: Math.round(Math.max(62, 96 - spread * 100)),
    risks,
    days: served.length,
  }
}

/**
 * Estime les rations à préparer pour demain et les risques de rupture.
 * Bascule silencieusement sur le moteur local si l'API est absente ou en échec.
 */
export async function predictRations({ history = [], supplies = [], lang = 'fr', fallbackHeadcount = 0 }) {
  const fallback = localRationForecast({ history, supplies, fallbackHeadcount })
  if (!isDeepSeekEnabled() || fallback.headcount === 0) return fallback

  const system =
    'Tu es analyste anti-gaspillage pour une cantine scolaire (PAM / DCS). À partir de ' +
    "l'historique des repas servis et des stocks, estime le nombre de rations à préparer " +
    'demain. Réponds uniquement en JSON: {"headcount":<entier>,"confidence":<50-99>,' +
    '"note":"<max 110 caractères>"}.'
  const user = JSON.stringify({
    langue: lang,
    effectif: fallbackHeadcount,
    historique: history.slice(0, 14).map((entry) => ({
      date: entry.service_date,
      servis: entry.served,
    })),
    stocks: supplies.map((supply) => ({
      article: supply.name,
      unite: supply.unit,
      stock: Number(supply.stock),
      par_rationnaire: Number(supply.qty_per_person),
    })),
  })

  try {
    const answer = await askDeepSeek({ system, user })
    const headcount = Math.round(Number(answer.headcount))
    if (!Number.isFinite(headcount) || headcount <= 0) throw new Error('Prévision invalide')

    return {
      source: 'ia',
      headcount,
      confidence: clampScore(answer.confidence, fallback.confidence),
      risks: lowStockRisks({ headcount, supplies }),
      days: fallback.days,
      note: String(answer.note ?? '').slice(0, 140),
    }
  } catch {
    return fallback
  }
}
