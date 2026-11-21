export const MODELS = {
  public_dcs: {
    label: 'Cantine publique (DCS / PAM)',
    short: 'Publique DCS / PAM',
    accent: 'teal',
    priceNote: 'Tarif subventionné 25 FCFA / repas',
    sources: [
      { value: 'gouvernement', label: 'Gouvernement / DCS' },
      { value: 'pam', label: 'PAM' },
      { value: 'achats_locaux', label: 'Achats locaux (groupements agricoles)' },
      { value: 'communaute', label: 'Communauté' },
    ],
    finance: {
      revenue: 'Recette (25 F / repas)',
      versements: 'État des versements (40 %)',
      salary: 'Salaire cantinière (5 F / plat)',
      employer: null,
      payer: null,
      fund: 'Fonds de fonctionnement local',
    },
    showPamImpact: true,
  },
  prive: {
    label: 'École privée / Supérieur',
    short: 'Privé / Supérieur',
    accent: 'sky',
    priceNote: 'Tarif libre, payé à 100 % par les familles',
    sources: [
      { value: 'achats_locaux', label: 'Achats locaux (groupements agricoles)' },
      { value: 'organisation', label: 'Fournisseur / Organisation' },
      { value: 'communaute', label: 'Communauté' },
    ],
    finance: {
      revenue: 'Encaissements familles (100 %)',
      versements: null,
      salary: null,
      employer: null,
      payer: null,
      fund: 'Marge de fonctionnement',
    },
    showPamImpact: false,
  },
  entreprise: {
    label: "Cantine d'entreprise",
    short: 'Entreprise',
    accent: 'steel',
    priceNote: 'Subvention employeur configurable',
    sources: [
      { value: 'achats_locaux', label: 'Achats locaux (groupements agricoles)' },
      { value: 'organisation', label: 'Fournisseur / Organisation' },
    ],
    finance: {
      revenue: 'Valeur des repas servis',
      versements: null,
      salary: null,
      employer: 'Part employeur',
      payer: 'Part salarié',
      fund: 'Ressources de la cantine',
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
