export const cx = (...classes) => classes.filter(Boolean).join(' ')

const money = new Intl.NumberFormat('fr-FR')

export const fcfa = (value) => `${money.format(Number(value ?? 0))} F`

export const toISODate = (date) => {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const todayISO = () => toISODate(new Date())

export const addDays = (value, days) => {
  const d = new Date(`${value}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export const formatDay = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

export const formatDayShort = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
  })

export const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : ''

export const ROLE_LABELS = {
  eleve: 'Élève',
  parent: 'Parent',
  gerant: 'Gérant',
  directeur: 'Directeur',
  conseiller_dcs: 'Conseiller DCS',
}

export const ROLE_HOME = {
  eleve: '/eleve/menu',
  parent: '/parent',
  gerant: '/admin',
  directeur: '/admin',
  conseiller_dcs: '/supervision',
}

export const isStaff = (role) => ['gerant', 'directeur', 'conseiller_dcs'].includes(role)
