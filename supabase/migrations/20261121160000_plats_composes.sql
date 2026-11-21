-- ============================================================
--  14 — Plats composés : base + protéine
-- ============================================================
-- Une cantine ivoirienne se lit en deux colonnes : la base (riz, frites,
-- attiéké, aloco) et ce qui l'accompagne (sauce graine, sauce légume, poulet,
-- poisson). On stocke les deux pour filtrer et afficher proprement.

alter table public.meals
  add column if not exists base_label text,
  add column if not exists protein_label text;

-- Reprise des plats existants
update public.meals
   set base_label = coalesce(base_label, split_part(name, ' ', 1)),
       protein_label = coalesce(
         protein_label,
         nullif(trim(substring(name from position(' ' in name) + 1)), '')
       )
 where base_label is null;

-- Carte de démonstration : cinq combinaisons sur la semaine
do $$
declare
  v_school uuid;
  v_day date;
begin
  select id into v_school from public.schools where model = 'prive' order by created_at limit 1;
  if v_school is null then
    return;
  end if;

  for i in 0..6 loop
    v_day := current_date + i;

    insert into public.meals
      (school_id, service_date, name, description, price, allergens, vegetarian,
       capacity, base_label, protein_label)
    values
      (v_school, v_day, 'Riz sauce graine',
       'Riz local, sauce graine et poisson fumé', 1500, array['poisson'], false, 200, 'Riz', 'Sauce graine'),
      (v_school, v_day, 'Riz sauce légume',
       'Riz, légumes de saison et huile rouge', 1500, array[]::text[], true, 200, 'Riz', 'Sauce légume'),
      (v_school, v_day, 'Frites poulet',
       'Frites maison, poulet braisé et alloco de plantain', 2000, array[]::text[], false, 150, 'Frites', 'Poulet'),
      (v_school, v_day, 'Attiéké poisson',
       'Attiéké, poisson braisé et tomates fraîches', 2000, array['poisson'], false, 150, 'Attiéké', 'Poisson'),
      (v_school, v_day, 'Aloco poisson',
       'Plantain mûr frit, poisson braisé et piment doux', 2000, array['poisson'], false, 120, 'Aloco', 'Poisson')
    on conflict (school_id, service_date, name) do update
      set base_label = excluded.base_label,
          protein_label = excluded.protein_label,
          description = excluded.description,
          price = excluded.price,
          allergens = excluded.allergens,
          vegetarian = excluded.vegetarian,
          capacity = excluded.capacity;
  end loop;
end;
$$;
