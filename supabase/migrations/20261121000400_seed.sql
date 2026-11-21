-- ============================================================
--  04 — Données de démonstration
-- ============================================================

-- ---------- École ----------
insert into public.schools (name, city, director_name, enrolled_count)
values ('EPP Vatel Cocody', 'Abidjan', 'Mme Koné Adjoua', 216);

-- ---------- Comptes de démonstration (mot de passe : Demo1234!) ----------
do $$
declare
  u record;
  v_id uuid;
begin
  for u in
    select * from (values
      ('eleve@vatel.test',    'Awa Traoré',      'eleve'),
      ('eleve2@vatel.test',   'Koffi Yao',       'eleve'),
      ('eleve3@vatel.test',   'Fatou Diallo',    'eleve'),
      ('parent@vatel.test',   'Mariam Traoré',   'parent'),
      ('gerant@vatel.test',   'M. Fofana',       'gerant'),
      ('directeur@vatel.test','Mme Koné Adjoua', 'directeur'),
      ('dcs@vatel.test',      'Conseiller DCS',  'conseiller_dcs')
    ) as t(email, full_name, role)
  loop
    if not exists (select 1 from auth.users where email = u.email) then
      v_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_id,
        'authenticated',
        'authenticated',
        u.email,
        extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', u.full_name, 'role', u.role),
        now(),
        now()
      );

      insert into auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        v_id::text, v_id,
        jsonb_build_object('sub', v_id::text, 'email', u.email),
        'email', now(), now(), now()
      );
    end if;
  end loop;
end $$;

-- ---------- Soldes, allergies et liens parent/enfant ----------
update public.profiles set balance = 500, allergies = array['arachide']
 where id = (select id from auth.users where email = 'eleve@vatel.test');

update public.profiles set balance = 300
 where id = (select id from auth.users where email = 'eleve2@vatel.test');

update public.profiles set balance = 250, allergies = array['poisson']
 where id = (select id from auth.users where email = 'eleve3@vatel.test');

update public.profiles
   set parent_id = (select id from auth.users where email = 'parent@vatel.test')
 where id = (select id from auth.users where email = 'eleve@vatel.test');

-- ---------- Menus de la semaine ----------
insert into public.meals (school_id, service_date, name, description, allergens, vegetarian, capacity)
select
  (select id from public.schools order by created_at limit 1),
  d::date,
  m.name,
  m.description,
  m.allergens,
  m.vegetarian,
  150
from (
  select current_date + offs as d, offs from generate_series(0, 6) as offs
) days
cross join lateral (
  values
    ('Riz sauce graine', 'Riz local, sauce graine et poisson fumé', array['poisson'], false),
    ('Riz sauce légume', 'Riz, légumes de saison et huile rouge', array[]::text[], true)
) as m(name, description, allergens, vegetarian)
on conflict do nothing;

-- ---------- Vivres et rations par personne ----------
insert into public.supplies (school_id, name, unit, stock, min_stock, qty_per_person)
select (select id from public.schools order by created_at limit 1), s.*
from (
  values
    ('Riz',     'kg',    250.00, 50.00, 0.150),
    ('Huile',   'L',      40.00,  8.00, 0.020),
    ('Sardines','boîte', 120.00, 24.00, 0.500),
    ('Tomate',  'kg',     30.00, 10.00, 0.050),
    ('Oignon',  'kg',     25.00,  8.00, 0.030),
    ('Poisson', 'kg',     30.00, 10.00, 0.080),
    ('Légumes', 'kg',     40.00, 10.00, 0.100),
    ('Sel',     'kg',     20.00,  5.00, 0.005)
) as s(name, unit, stock, min_stock, qty_per_person)
on conflict do nothing;

-- ---------- Matériel de cuisine ----------
insert into public.kitchen_items (school_id, name, quantity, condition, note)
select (select id from public.schools order by created_at limit 1), k.*
from (
  values
    ('Marmite 50 L', 3, 'bon', null),
    ('Marmite 30 L', 2, 'a_remplacer', 'Fond percé, à remplacer'),
    ('Cuillère de service', 6, 'bon', null),
    ('Bassine plastique', 8, 'bon', null),
    ('Fourneau à gaz', 2, 'bon', null),
    ('Balance de cuisine', 1, 'hors_service', 'Ne s''allume plus')
) as k(name, quantity, condition, note);

-- ---------- Historique comptable (3 derniers jours) ----------
insert into public.daily_accounting (school_id, service_date, served_count)
select (select id from public.schools order by created_at limit 1), current_date - offs, served
from (values (1, 182), (2, 175), (3, 190)) as h(offs, served)
on conflict do nothing;

-- ---------- Assiduité ----------
insert into public.attendance_records (school_id, record_date, enrolled, present, note)
select (select id from public.schools order by created_at limit 1), current_date - offs, 216, present, null
from (values (1, 208), (2, 203), (3, 212)) as a(offs, present)
on conflict do nothing;

-- ---------- Contrôle hygiène de référence ----------
insert into public.hygiene_checks (school_id, checklist, score, note)
select
  (select id from public.schools order by created_at limit 1),
  '[{"label":"Sols et murs propres","ok":true},
    {"label":"Plats couverts et protégés","ok":true},
    {"label":"Présence de savon et eau","ok":true},
    {"label":"Tenue propre du personnel","ok":false},
    {"label":"Absence de nuisibles","ok":true},
    {"label":"Frigo à température","ok":false}]'::jsonb,
  67,
  'Tenue de la cantinière à renouveler'
where not exists (select 1 from public.hygiene_checks);
