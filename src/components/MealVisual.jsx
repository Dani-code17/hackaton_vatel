/**
 * Illustration d'un plat : dégradé de la charte + nom de la base en grand.
 * Sert de visuel de secours tant que le gérant n'a pas envoyé de photo, et
 * remplace les icônes génériques qui ne disaient rien à l'utilisateur.
 */
export default function MealVisual({ meal, className = '' }) {
  const base = (meal?.base_label ?? meal?.name ?? 'Plat').split(' ')[0]
  const tone = {
    Riz: 'from-brand-900 via-brand-700 to-brand-500',
    Frites: 'from-coral-700 via-coral-500 to-amber-400',
    Attiéké: 'from-emerald-800 via-emerald-600 to-lime-400',
    Aloco: 'from-amber-700 via-amber-500 to-yellow-300',
    Garba: 'from-brand-900 via-brand-500 to-brand-200',
  }[base] ?? 'from-brand-900 via-brand-700 to-brand-500'

  if (meal?.photo_url) {
    return (
      <img
        src={meal.photo_url}
        alt={meal.name}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${tone} ${className}`}
      aria-hidden="true"
    >
      <span className="font-display text-[15px] font-extrabold uppercase tracking-[0.18em] text-white/85">
        {base}
      </span>
      {meal?.protein_label && meal.protein_label !== base ? (
        <span className="absolute bottom-1 right-2 font-display text-[9px] font-semibold uppercase tracking-[0.1em] text-white/60">
          {meal.protein_label}
        </span>
      ) : null}
    </div>
  )
}
