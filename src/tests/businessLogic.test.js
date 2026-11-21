import { describe, expect, it } from 'vitest'
import {
  GBT_RULES,
  RATION_RECIPE,
  accountingBreakdown,
  allergyConflicts,
  employerSplit,
  forecastHeadcount,
  isMealSafe,
  lowStockRisks,
  rationsFor,
} from '../lib/business'
import { localMealAdvice, localRationForecast } from '../services/deepseekAI'

describe('Comptabilité cantine publique EPP GBT (barème 25 F / 40 % / 5 F)', () => {
  it('répartit 200 rationnaires à 25 FCFA', () => {
    const day = accountingBreakdown({ served: 200, ...GBT_RULES })

    expect(day.revenue).toBe(5000)
    expect(day.versements).toBe(2000)
    expect(day.cantiniereSalary).toBe(1000)
    expect(day.localFund).toBe(2000)
  })

  it('conserve un fonds de condiments de 10 F par élève servi', () => {
    const day = accountingBreakdown({ served: 137, ...GBT_RULES })

    expect(day.revenue).toBe(3425)
    expect(day.versements + day.cantiniereSalary + day.localFund).toBe(day.revenue)
    expect(day.localFund).toBe(137 * GBT_RULES.condimentsPerMeal)
  })

  it('ne produit jamais de montants négatifs pour une journée vide', () => {
    expect(accountingBreakdown({ served: 0 })).toEqual({
      served: 0,
      revenue: 0,
      versements: 0,
      cantiniereSalary: 0,
      localFund: 0,
    })
  })
})

describe('Calculateur de rations (riz, sardines, huile)', () => {
  it('convertit 140 rationnaires en quantités exactes', () => {
    const rations = rationsFor(140)
    const byKey = Object.fromEntries(rations.map((line) => [line.key, line.quantity]))

    expect(byKey.riz).toBe(21)
    expect(byKey.sardines).toBe(35)
    expect(byKey.huile).toBe(2.1)
  })

  it('arrondit au centième et gère zéro rationnaire', () => {
    const lines = rationsFor(33, RATION_RECIPE)
    expect(lines.find((line) => line.key === 'huile').quantity).toBe(0.5)
    expect(rationsFor(0).every((line) => line.quantity === 0)).toBe(true)
  })

  it('signale les articles dont le stock ne couvre pas le service', () => {
    const risks = lowStockRisks({
      headcount: 140,
      supplies: [
        { name: 'Riz', unit: 'kg', stock: 100, qty_per_person: 0.15 },
        { name: 'Huile', unit: 'L', stock: 1, qty_per_person: 0.015 },
        { name: 'Sel', unit: 'kg', stock: 0, qty_per_person: 0 },
      ],
    })

    expect(risks).toHaveLength(1)
    expect(risks[0]).toMatchObject({ name: 'Huile', needed: 2.1, stock: 1, shortfall: 1.1 })
  })
})

describe('Partage cantine d’entreprise ACMC (subvention employeur)', () => {
  it('partage 50 / 50 un repas à 1 000 FCFA', () => {
    expect(employerSplit({ price: 1000, subsidyPct: 50 })).toEqual({
      total: 1000,
      employerShare: 500,
      payerShare: 500,
    })
  })

  it('respecte une autre politique de subvention', () => {
    expect(employerSplit({ price: 1200, subsidyPct: 60 })).toMatchObject({
      employerShare: 720,
      payerShare: 480,
    })
  })

  it('borne la subvention entre 0 et 100 %', () => {
    expect(employerSplit({ price: 1000, subsidyPct: 130 }).employerShare).toBe(1000)
    expect(employerSplit({ price: 1000, subsidyPct: -20 }).payerShare).toBe(1000)
  })
})

describe('Blocage en cas d’allergie déclarée', () => {
  it('détecte un allergène même avec une casse ou des espaces différents', () => {
    expect(allergyConflicts(['Arachide', ' poisson '], ['arachide'])).toEqual(['Arachide'])
  })

  it('laisse passer un plat compatible', () => {
    expect(isMealSafe({ allergens: ['lait'] }, ['arachide', 'poisson'])).toBe(true)
  })

  it('un plat allergène est écarté de la recommandation locale', () => {
    const meals = [
      { id: 'm1', name: 'Riz sauce graine', allergens: ['poisson'], price: 25, avg_rating: 4.9 },
      { id: 'm2', name: 'Riz sauce légume', allergens: [], price: 25, avg_rating: 4.2, vegetarian: true },
    ]

    const advice = localMealAdvice({
      meals,
      allergies: ['poisson'],
      balance: 1000,
      labels: { safe: 'sans', rating: 'noté', light: 'léger' },
    })

    expect(advice.mealId).toBe('m2')
    expect(advice.safe).toBe(true)
    expect(advice.reason).toContain('sans poisson')
  })
})

describe('Prévision anti-gaspillage', () => {
  it('moyenne les trois derniers services en pondérant le plus récent', () => {
    // (300×3 + 250×2 + 200×1) / 6 = 267
    expect(forecastHeadcount([{ served: 300 }, { served: 250 }, { served: 200 }])).toBe(267)
    expect(forecastHeadcount([])).toBe(0)
  })

  it('produit une prévision locale avec les risques de rupture associés', () => {
    const forecast = localRationForecast({
      history: [{ served: 180 }, { served: 160 }],
      supplies: [{ name: 'Riz', unit: 'kg', stock: 10, qty_per_person: 0.15 }],
    })

    expect(forecast.source).toBe('local')
    expect(forecast.headcount).toBeGreaterThan(160)
    expect(forecast.confidence).toBeGreaterThanOrEqual(62)
    expect(forecast.risks[0].name).toBe('Riz')
  })
})
