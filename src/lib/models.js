export const MODELS = {
  public_dcs: {
    label: 'model.public.label',
    short: 'model.public.short',
    accent: 'teal',
    priceNote: 'model.public.priceNote',
    sources: [
      { value: 'gouvernement', label: 'source.government' },
      { value: 'pam', label: 'source.wfp' },
      { value: 'achats_locaux', label: 'source.local' },
      { value: 'communaute', label: 'source.community' },
    ],
    finance: {
      revenue: 'accounting.revenue',
      versements: 'accounting.versements',
      salary: 'accounting.salary',
      employer: null,
      payer: null,
      fund: 'accounting.fund',
    },
    showPamImpact: true,
  },
  prive: {
    label: 'model.private.label',
    short: 'model.private.short',
    accent: 'sky',
    priceNote: 'model.private.priceNote',
    sources: [
      { value: 'achats_locaux', label: 'source.local' },
      { value: 'organisation', label: 'source.supplier' },
      { value: 'communaute', label: 'source.community' },
    ],
    finance: {
      revenue: 'accounting.revenuePrivate',
      versements: null,
      salary: null,
      employer: null,
      payer: null,
      fund: 'accounting.margin',
    },
    showPamImpact: false,
  },
  entreprise: {
    label: 'model.company.label',
    short: 'model.company.short',
    accent: 'steel',
    priceNote: 'model.company.priceNote',
    sources: [
      { value: 'achats_locaux', label: 'source.local' },
      { value: 'organisation', label: 'source.supplier' },
    ],
    finance: {
      revenue: 'accounting.value',
      versements: null,
      salary: null,
      employer: 'accounting.employer',
      payer: 'accounting.payer',
      fund: 'accounting.resources',
    },
    showPamImpact: false,
  },
}

export const ACCENTS = {
  teal: {
    badge: 'bg-brand-50 text-brand-900 ring-1 ring-brand-200',
    bar: 'bg-brand-900',
    soft: 'bg-brand-200',
    text: 'text-brand-900',
  },
  violet: {
    badge: 'bg-coral-100 text-coral-700 ring-1 ring-coral-300',
    bar: 'bg-coral-500',
    soft: 'bg-coral-200',
    text: 'text-coral-700',
  },
  sky: {
    badge: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
    bar: 'bg-brand-500',
    soft: 'bg-brand-100',
    text: 'text-brand-700',
  },
  steel: {
    badge: 'bg-slate-100 text-brand-900 ring-1 ring-slate-300',
    bar: 'bg-brand-700',
    soft: 'bg-brand-100',
    text: 'text-brand-900',
  },
}

export const modelConfig = (model) => MODELS[model] ?? MODELS.prive

export const accentOf = (model) => ACCENTS[modelConfig(model).accent]

export const sourcesFor = (model) => modelConfig(model).sources

/** Jours gagnés grâce aux achats locaux, plafonnés à 25 comme dans le référentiel PAM. */
export const daysGained = ({ localKg = 0, enrolled = 0, rationPerPerson = 0.15 }) => {
  const dailyNeed = Math.max(1, Math.round(enrolled * rationPerPerson))
  return Math.min(25, Math.floor(localKg / dailyNeed))
}
