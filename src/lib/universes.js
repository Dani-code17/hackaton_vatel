export const UNIVERSES = {
  vatel: {
    id: 'vatel',
    model: 'prive',
    name: 'Vatel Campus',
    title: 'VATEL • Cantine Campus Abidjan',
    chip: 'Campus supérieur',
    tagline: 'Superieur & privé',
    description:
      'Tarif étudiant, paiement Wave / Orange Money, allergènes, notation des plats et pass QR.',
    icon: '🎓',
    swatches: ['#072A5D', '#FF675B', '#89C2EA'],
    paletteNote: 'Marine · Corail · Bleu ciel',
    staffNav: [
      { to: '/admin/menus', label: 'Carte', icon: '📖' },
      { to: '/admin/commandes', label: 'Pass QR', icon: '🎫' },
      { to: '/admin/comptabilite', label: 'Solde & Wave', icon: '💳' },
      { to: '/admin', label: 'Gestion Chef', icon: '👨‍🍳', end: true },
    ],
    studentNav: [
      { to: '/eleve/menu', label: 'Carte', icon: '📖' },
      { to: '/eleve/reservations', label: 'Pass QR', icon: '🎫' },
      { to: '/eleve/compte', label: 'Solde & Wave', icon: '💳' },
    ],
  },
  gbt: {
    id: 'gbt',
    model: 'public_dcs',
    name: 'EPP GBT',
    title: 'CANTINES SCOLAIRES GBT • Suivi DCS & PAM',
    chip: 'Cantine publique',
    tagline: 'DCS / PAM',
    description:
      '25 F par repas, versements 40 %, rationnaires, hygiène photographiée et couverture PAM.',
    icon: '🌾',
    swatches: ['#065F46', '#D97706', '#FFFBEB'],
    paletteNote: 'Émeraude · Ambre · Fond chaud',
    staffNav: [
      { to: '/admin/comptabilite', label: 'Cahier 25F', icon: '🧮' },
      { to: '/admin/stock', label: 'Rations & Stock', icon: '📦' },
      { to: '/admin/hygiene', label: 'Hygiène Live', icon: '🧼' },
      { to: '/admin', label: 'Supervision PAM', icon: '🛰️', end: true },
    ],
    dcsNav: [{ to: '/supervision', label: 'Supervision PAM', icon: '🛰️', end: true }],
  },
  acmc: {
    id: 'acmc',
    model: 'entreprise',
    name: 'ACMC Entreprise',
    title: 'ACMC CORPORATE • Restauration Salariés',
    chip: "Cantine d'entreprise",
    tagline: 'Corporate',
    description:
      'Subvention employeur 50 %, part salarié, menus express et suivi de consommation par salarié.',
    icon: '🏢',
    swatches: ['#0F172A', '#2563EB', '#F8FAFC'],
    paletteNote: 'Slate · Bleu corporate',
    staffNav: [
      { to: '/admin/menus', label: 'Menu Express', icon: '⚡' },
      { to: '/admin/comptabilite', label: 'Badge 50%', icon: '🏷️' },
      { to: '/admin/ecole', label: 'Portail RH', icon: '👔' },
    ],
  },
}

export const UNIVERSE_ORDER = ['vatel', 'gbt', 'acmc']

export const universeForModel = (model) => {
  if (model === 'public_dcs') return 'gbt'
  if (model === 'entreprise') return 'acmc'
  return 'vatel'
}

export const universeConfig = (id) => UNIVERSES[id] ?? UNIVERSES.vatel

/** Couleur de barre d'outils du navigateur, alignée sur l'en-tête de chaque univers. */
export const HEADER_COLOR = {
  vatel: '#072A5D',
  gbt: '#065F46',
  acmc: '#0F172A',
}

export const navFor = (universe, role) => {
  const config = universeConfig(universe)
  if (role === 'conseiller_dcs') return config.dcsNav ?? config.staffNav
  if (role === 'eleve' || role === 'parent') return config.studentNav ?? config.staffNav
  return config.staffNav
}
