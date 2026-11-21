-- ============================================================
--  08 — Trois établissements de démonstration + indicateurs PAM
-- ============================================================

-- ---------- 1. Cantine de Vatel — Campus Supérieur (modèle privé) ----------
update public.schools
   set name = 'Cantine de Vatel — Campus Supérieur',
       city = 'Abidjan',
       director_name = 'Direction du Campus',
       enrolled_count = 1200,
       model = 'prive',
       meal_price = 1500,
       versements_pct = 0,
       cantiniere_per_meal = 0,
       condiments_per_meal = 0,
       employer_subsidy_pct = 0,
       cover_days_current = 0,
       cover_days_target = 120
 where name in ('EPP Vatel Cocody', 'Cantine de Vatel — Campus Supérieur');

update public.meals
   set price = 1500
 where school_id = (
   select id from public.schools where model = 'prive' order by created_at limit 1
 );

update public.daily_accounting
   set meal_price = 1500, versements_pct = 0, cantiniere_per_meal = 0
 where school_id = (
   select id from public.schools where model = 'prive' order by created_at limit 1
 );

update public.profiles set balance = 7500
 where id = (select id from auth.users where email = 'eleve@vatel.test');
update public.profiles set balance = 6000
 where id = (select id from auth.users where email = 'eleve2@vatel.test');
update public.profiles set balance = 5000
 where id = (select id from auth.users where email = 'eleve3@vatel.test');

-- ---------- 2. EPP GBT — Cantine publique DCS / PAM ----------
do $$
declare
  v_school uuid;
begin
  select id into v_school from public.schools where name = 'EPP GBT';

  if v_school is null then
    insert into public.schools
      (name, city, director_name, enrolled_count, model, meal_price,
       versements_pct, cantiniere_per_meal, condiments_per_meal,
       employer_subsidy_pct, cover_days_current, cover_days_target)
    values
      ('EPP GBT', 'Gbéléban', 'M. Fofana', 320, 'public_dcs', 25,
       40, 5, 10, 0, 73, 120)
    returning id into v_school;
  end if;

  insert into public.meals
    (school_id, service_date, name, description, allergens, vegetarian, capacity, price)
  select
    v_school, days.d::date, m.name, m.description, m.allergens, m.vegetarian, 320, 25
  from (
    select current_date + offs as d from generate_series(0, 6) as offs
  ) days
  cross join lateral (
    values
      ('Riz sauce graine', 'Riz local, sauce graine et poisson fumé', array['poisson'], false),
      ('Riz sauce légume', 'Riz, légumes de saison et huile rouge', array[]::text[], true)
  ) as m(name, description, allergens, vegetarian)
  on conflict do nothing;

  insert into public.supplies
    (school_id, name, unit, stock, min_stock, qty_per_person)
  select v_school, s.*
  from (
    values
      ('Riz',      'kg',    600.00, 100.00, 0.150),
      ('Huile',    'L',      80.00,  15.00, 0.020),
      ('Sardines', 'boîte', 400.00,  60.00, 0.500),
      ('Tomate',   'kg',     60.00,  15.00, 0.050),
      ('Oignon',   'kg',     50.00,  12.00, 0.030),
      ('Poisson',  'kg',     70.00,  15.00, 0.080),
      ('Légumes',  'kg',     90.00,  20.00, 0.100),
      ('Sel',      'kg',     40.00,  10.00, 0.005)
  ) as s(name, unit, stock, min_stock, qty_per_person)
  on conflict do nothing;

  insert into public.kitchen_items (school_id, name, quantity, condition, note)
  select v_school, k.*
  from (
    values
      ('Marmite 100 L', 2, 'bon', null),
      ('Marmite 50 L', 3, 'a_remplacer', 'Fond usé'),
      ('Louche de service', 4, 'bon', null),
      ('Balance de cuisine', 1, 'bon', null)
  ) as k(name, quantity, condition, note);

  -- Achats locaux : 1,2 t de riz auprès d'un groupement agricole
  insert into public.supply_receptions
    (school_id, supply_id, quantity, source, received_on, note, weight_kg)
  select
    v_school,
    (select id from public.supplies where school_id = v_school and name = 'Riz'),
    1200, 'achats_locaux', current_date - 2, 'Groupement coopératif de Gbéléban', 1200
  where exists (select 1 from public.supplies where school_id = v_school and name = 'Riz');

  insert into public.daily_accounting
    (school_id, service_date, served_count, meal_price,
     versements_pct, cantiniere_per_meal, employer_subsidy_pct)
  select v_school, current_date - offs, served, 25, 40, 5, 0
  from (values (1, 268), (2, 255), (3, 291)) as h(offs, served)
  on conflict do nothing;

  insert into public.attendance_records
    (school_id, record_date, enrolled, present)
  select v_school, current_date - offs, 320, present
  from (values (1, 302), (2, 297), (3, 311)) as a(offs, present)
  on conflict do nothing;

  insert into public.hygiene_checks (school_id, checklist, score, note)
  select
    v_school,
    '[{"label":"Sols et murs propres","ok":true},
      {"label":"Plats couverts et protégés","ok":true},
      {"label":"Présence de savon et eau","ok":true},
      {"label":"Tenue propre du personnel","ok":true},
      {"label":"Absence de nuisibles","ok":true},
      {"label":"Frigo à température","ok":false}]'::jsonb,
    83,
    'Magasin bien tenu, chaîne du froid à revoir'
  where not exists (
    select 1 from public.hygiene_checks where school_id = v_school
  );
end $$;

-- ---------- 3. Cantine Entreprise — Groupe ACMC ----------
do $$
declare
  v_school uuid;
begin
  select id into v_school from public.schools where name = 'Cantine Entreprise — Groupe ACMC';

  if v_school is null then
    insert into public.schools
      (name, city, director_name, enrolled_count, model, meal_price,
       versements_pct, cantiniere_per_meal, condiments_per_meal,
       employer_subsidy_pct, cover_days_current, cover_days_target)
    values
      ('Cantine Entreprise — Groupe ACMC', 'Abidjan', 'Direction RH', 450, 'entreprise', 1000,
       0, 0, 0, 50, 0, 120)
    returning id into v_school;
  end if;

  insert into public.meals
    (school_id, service_date, name, description, allergens, vegetarian, capacity, price)
  select
    v_school, days.d::date, m.name, m.description, m.allergens, m.vegetarian, 450, 1000
  from (
    select current_date + offs as d from generate_series(0, 4) as offs
  ) days
  cross join lateral (
    values
      ('Menu du jour', 'Plat chaud, accompagnement et boisson', array[]::text[], false),
      ('Menu végétarien', 'Légumes de saison, céréales et fruit', array[]::text[], true)
  ) as m(name, description, allergens, vegetarian)
  on conflict do nothing;

  insert into public.supplies
    (school_id, name, unit, stock, min_stock, qty_per_person)
  select v_school, s.*
  from (
    values
      ('Riz',     'kg', 180.00, 40.00, 0.120),
      ('Poulet',  'kg',  60.00, 15.00, 0.150),
      ('Légumes', 'kg',  70.00, 20.00, 0.120),
      ('Huile',   'L',   30.00, 10.00, 0.015)
  ) as s(name, unit, stock, min_stock, qty_per_person)
  on conflict do nothing;

  insert into public.kitchen_items (school_id, name, quantity, condition)
  select v_school, k.*
  from (
    values
      ('Four à convection', 1, 'bon'),
      ('Vitrine réfrigérée', 2, 'bon'),
      ('Bain-marie', 2, 'a_remplacer')
  ) as k(name, quantity, condition);
end $$;

-- ---------- 4. Indicateurs d'impact PAM ----------
insert into public.impact_indicators (key, label, value, target, unit, note)
values
  ('couverture_jours', 'Couverture année scolaire', 73, 120, 'jours',
   'Moyenne nationale PAM'),
  ('couverture_projetee', 'Projection avec optimisation des stocks', 98, 120, 'jours',
   '+25 jours gagnés'),
  ('eleves_couverts', 'Élèves couverts', 194797, null, 'élèves',
   'Programme national'),
  ('achats_locaux', 'Achats locaux', 489.6, null, 't',
   'Groupements de producteurs')
on conflict (key) do update
  set label = excluded.label,
      value = excluded.value,
      target = excluded.target,
      unit = excluded.unit,
      note = excluded.note,
      updated_at = now();
