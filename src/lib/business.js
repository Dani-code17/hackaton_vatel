/**
 * Règles métier pures de la cantine.
 *
 * Ce module ne dépend ni de React ni de Supabase : il reproduit exactement les
 * formules appliquées côté PostgreSQL (colonnes générées de `daily_accounting`,
 * fonction `apply_rations`) afin de pouvoir les afficher en aperçu et les tester
 * unitairement. La base reste la seule source d'écriture.
 */

/** Référentiel de rations d'une cantine scolaire (quantité par rationnaire). */
export const RATION_RECIPE = {
  riz: { label: 'Riz', unit: 'kg', perPerson: 0.15 },
  sardines: { label: 'Sardines', unit: 'boîte', perPerson: 0.25 },
  huile: { label: 'Huile', unit: 'L', perPerson: 0.015 },
}

/** Barème officiel du modèle « Cantine publique DCS / PAM ». */
export const GBT_RULES = {
  mealPrice: 25,
  versementsPct: 40,
  cantinierePerMeal: 5,
  condimentsPerMeal: 10,
}

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

/**
 * Répartition comptable d'une journée de cantine publique.
 * Recette = repas servis × prix ; versements = recette × % État ;
 * salaire cantinière = repas servis × montant fixe ; le reste finance les condiments.
 */
export function accountingBreakdown({
  served = 0,
  mealPrice = GBT_RULES.mealPrice,
  versementsPct = GBT_RULES.versementsPct,
  cantinierePerMeal = GBT_RULES.cantinierePerMeal,
} = {}) {
  const count = Math.max(0, Math.round(Number(served) || 0))
  const revenue = count * Number(mealPrice)
  const versements = Math.round((revenue * Number(versementsPct)) / 100)
  const cantiniereSalary = count * Number(cantinierePerMeal)

  return {
    served: count,
    revenue,
    versements,
    cantiniereSalary,
    localFund: revenue - versements - cantiniereSalary,
  }
}

/** Quantités d'ingrédients nécessaires pour un nombre de rationnaires. */
export function rationsFor(headcount, recipe = RATION_RECIPE) {
  const count = Math.max(0, Math.round(Number(headcount) || 0))

  return Object.entries(recipe).map(([key, item]) => ({
    key,
    label: item.label,
    unit: item.unit,
    quantity: round2(item.perPerson * count),
  }))
}

/** Partage d'un repas entre l'employeur et le salarié (modèle entreprise). */
export function employerSplit({ price = 0, subsidyPct = 0 } = {}) {
  const total = Math.max(0, Number(price) || 0)
  const pct = Math.min(100, Math.max(0, Number(subsidyPct) || 0))
  const employerShare = Math.round((total * pct) / 100)

  return { total, employerShare, payerShare: total - employerShare }
}

const normalize = (value) => String(value ?? '').trim().toLowerCase()

/** Allergènes d'un plat qui entrent en conflit avec le profil de l'utilisateur. */
export function allergyConflicts(mealAllergens = [], profileAllergies = []) {
  const declared = profileAllergies.map(normalize).filter(Boolean)
  return mealAllergens.filter((allergen) => declared.includes(normalize(allergen)))
}

export function isMealSafe(meal, profileAllergies) {
  return allergyConflicts(meal?.allergens ?? [], profileAllergies).length === 0
}

/**
 * Prévision du nombre de rationnaires à partir de l'historique des repas servis.
 * Moyenne pondérée des trois derniers jours (le plus récent pèse le plus).
 */
export function forecastHeadcount(history = []) {
  const recent = history
    .map((entry) => Math.round(Number(entry?.served ?? entry) || 0))
    .filter((value) => value > 0)
    .slice(0, 3)

  if (recent.length === 0) return 0

  const weights = recent.map((_, index) => recent.length - index)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const weighted = recent.reduce((sum, value, index) => sum + value * weights[index], 0)

  return Math.round(weighted / totalWeight)
}

/** Articles dont le stock ne couvre pas la prévision de rationnaires. */
export function lowStockRisks({ headcount = 0, supplies = [] } = {}) {
  return supplies
    .filter((supply) => Number(supply.qty_per_person) > 0)
    .map((supply) => {
      const needed = round2(Number(supply.qty_per_person) * headcount)
      const stock = Number(supply.stock) || 0
      return {
        name: supply.name,
        unit: supply.unit,
        needed,
        stock,
        shortfall: round2(Math.max(0, needed - stock)),
      }
    })
    .filter((line) => line.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall)
}
