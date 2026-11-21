export const UNIVERSES = {
  vatel: {
    id: 'vatel',
    model: 'prive',
    name: 'Vatel Campus',
    title: 'VATEL • Cantine Campus Abidjan',
    barTitle: 'Vatel Cantine',
    shortName: 'Vatel Campus',
    barSubtitle: 'Vatel • Campus Abidjan',
    chip: 'Campus supérieur',
    taglineKey: 'universe.vatel.tagline',
    descriptionKey: 'universe.vatel.description',
    icon: '🎓',
    symbol: 'school',
    swatches: ['#072A5D', '#FF675B', '#89C2EA'],
    paletteNote: 'Marine · Corail · Bleu ciel',
    staffNav: [
      { to: '/admin/menus', labelKey: 'nav.carte', shortKey: 'nav.short.menu', icon: 'restaurant_menu' },
      { to: '/admin/commandes', labelKey: 'nav.pass', shortKey: 'nav.short.pass', icon: 'qr_code_2' },
      { to: '/admin/comptabilite', labelKey: 'nav.wallet', shortKey: 'nav.short.wallet', icon: 'account_balance_wallet' },
      { to: '/admin', labelKey: 'nav.chef', shortKey: 'nav.short.chef', icon: 'space_dashboard', end: true },
    ],
    studentNav: [
      { to: '/eleve/menu', labelKey: 'nav.carte', shortKey: 'nav.short.menu', icon: 'restaurant_menu' },
      { to: '/eleve/reservations', labelKey: 'nav.pass', shortKey: 'nav.short.pass', icon: 'qr_code_2' },
      { to: '/eleve/compte', labelKey: 'nav.wallet', shortKey: 'nav.short.wallet', icon: 'account_balance_wallet' },
    ],
  },
  gbt: {
    id: 'gbt',
    model: 'public_dcs',
    name: 'EPP GBT',
    title: 'CANTINES SCOLAIRES GBT • Suivi DCS & PAM',
    barTitle: 'GBT Cantine',
    shortName: 'EPP GBT',
    barSubtitle: 'Cantines scolaires • DCS / PAM',
    chip: 'Cantine publique',
    taglineKey: 'universe.gbt.tagline',
    descriptionKey: 'universe.gbt.description',
    icon: '🌾',
    symbol: 'agriculture',
    swatches: ['#065F46', '#D97706', '#FFFBEB'],
    paletteNote: 'Émeraude · Ambre · Fond chaud',
    staffNav: [
      { to: '/admin/comptabilite', labelKey: 'nav.cahier', shortKey: 'nav.short.ledger', icon: 'receipt_long' },
      { to: '/admin/stock', labelKey: 'nav.rations', shortKey: 'nav.short.stock', icon: 'inventory_2' },
      { to: '/admin/hygiene', labelKey: 'nav.hygiene', shortKey: 'nav.short.hygiene', icon: 'clean_hands' },
      { to: '/admin', labelKey: 'nav.supervision', shortKey: 'nav.short.pam', icon: 'monitoring', end: true },
    ],
    dcsNav: [{ to: '/supervision', labelKey: 'nav.supervision', shortKey: 'nav.short.pam', icon: 'monitoring', end: true }],
  },
  acmc: {
    id: 'acmc',
    model: 'entreprise',
    name: 'ACMC Entreprise',
    title: 'ACMC CORPORATE • Restauration Salariés',
    barTitle: 'ACMC Cantine',
    shortName: 'ACMC',
    barSubtitle: 'ACMC • Restauration salariés',
    chip: "Cantine d'entreprise",
    taglineKey: 'universe.acmc.tagline',
    descriptionKey: 'universe.acmc.description',
    icon: '🏢',
    symbol: 'apartment',
    swatches: ['#0F172A', '#2563EB', '#F8FAFC'],
    paletteNote: 'Slate · Bleu corporate',
    staffNav: [
      { to: '/admin/menus', labelKey: 'nav.menuExpress', shortKey: 'nav.short.menu', icon: 'bolt' },
      { to: '/admin/comptabilite', labelKey: 'nav.badge', shortKey: 'nav.short.badge', icon: 'badge' },
      { to: '/admin/ecole', labelKey: 'nav.rh', shortKey: 'nav.short.rh', icon: 'groups' },
      { to: '/admin', labelKey: 'nav.dashboard', shortKey: 'nav.short.dashboard', icon: 'space_dashboard', end: true },
    ],
  },
}

// Un seul univers actif : la cantine de Vatel. Les deux autres modèles restent
// décrits dans le code mais ne sont plus exposés à l'interface.
export const UNIVERSE_ORDER = ['vatel']

export const MULTI_UNIVERSE_ENABLED = false

export const universeForModel = () => 'vatel'

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