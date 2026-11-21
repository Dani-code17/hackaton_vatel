import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LanguageContext,
  readStoredLanguage,
  storeLanguage,
  translate,
} from '../i18n/language'
import { setFormatLocale } from '../lib/format'
import { LANGUAGES } from '../i18n/translations'

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLanguage)

  // Appliqué pendant le rendu : les dates doivent suivre la langue immédiatement.
  setFormatLocale(LANGUAGES[lang].locale)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next) => {
    if (!LANGUAGES[next]) return
    setLangState(next)
    storeLanguage(next)
  }, [])

  const toggle = useCallback(() => {
    setLangState((current) => {
      const next = current === 'fr' ? 'en' : 'fr'
      storeLanguage(next)
      return next
    })
  }, [])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo(
    () => ({ lang, locale: LANGUAGES[lang].locale, language: LANGUAGES[lang], setLang, toggle, t }),
    [lang, setLang, toggle, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
