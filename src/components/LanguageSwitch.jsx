import { useLanguage } from '../i18n/language'

/** Sélecteur FR | EN affiché dans l'en-tête de tous les univers. */
export default function LanguageSwitch() {
  const { lang, setLang, t } = useLanguage()

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex h-6 items-center rounded-full bg-white/12 p-0.5 ring-1 ring-white/25"
    >
      {['fr', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={
            'rounded-full px-1.5 py-0.5 font-display text-[8.5px] font-bold uppercase tracking-[0.06em] transition ' +
            (lang === code
              ? 'bg-white text-brand-900 shadow-sm'
              : 'text-white/70 hover:text-white')
          }
        >
          {code}
        </button>
      ))}
    </div>
  )
}
