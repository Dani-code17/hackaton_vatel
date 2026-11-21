import { createContext, useContext } from 'react'
import { DEFAULT_LANGUAGE, LANGUAGES, TRANSLATIONS } from './translations'

const STORAGE_KEY = 'cantine.lang'

export const LanguageContext = createContext(null)

export function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && LANGUAGES[stored]) return stored
  } catch {
    // localStorage indisponible (navigation privée)
  }
  return DEFAULT_LANGUAGE
}

export function storeLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // stockage refusé : la langue reste active pour la session
  }
}

/** Traduit une clé et remplace les variables `{nom}` par leur valeur. */
export function translate(lang, key, vars) {
  const dictionary = TRANSLATIONS[lang] ?? TRANSLATIONS[DEFAULT_LANGUAGE]
  const fallback = TRANSLATIONS[DEFAULT_LANGUAGE]
  let value = dictionary[key] ?? fallback[key] ?? key

  if (vars) {
    value = Object.entries(vars).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
      value,
    )
  }

  return value
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage doit être utilisé dans LanguageProvider')
  return context
}
