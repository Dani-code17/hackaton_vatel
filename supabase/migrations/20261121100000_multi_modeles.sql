-- ============================================================
--  06 — Multi-modèles d'établissement + indicateurs PAM / DCS
-- ============================================================

-- 1. Configuration par établissement -----------------------------------------
alter table public.schools
  add column if not exists model text not null default 'prive'
    check (model in ('public_dcs', 'prive', 'entreprise')),
  add column if not exists meal_price int not null default 1500
    check (meal_price >= 0),
  add column if not exists versements_pct int not null default 0
    check (versements_pct between 0 and 100),
  add column if not exists cantiniere_per_meal int not null default 0
    check (cantiniere_per_meal >= 0),
  add column if not exists condiments_per_meal int not null default 0
    check (condiments_per_meal >= 0),
  add column if not exists employer_subsidy_pct int not null default 0
    check (employer_subsidy_pct between 0 and 100),
  add column if not exists cover_days_current int not null default 0,
  add column if not exists cover_days_target int not null default 120;

-- 2. Comptabilité paramétrable par modèle ------------------------------------
alter table public.daily_accounting
  drop column if exists local_fund,
  drop column if exists cantiniere_salary,
  drop column if exists versements,
  drop column if exists revenue;

alter table public.daily_accounting
  add column if not exists versements_pct int not null default 40,
  add column if not exists cantiniere_per_meal int not null default 5,
  add column if not exists employer_subsidy_pct int not null default 0,
  add column if not exists revenue int generated always as
    (served_count * meal_price) stored,
  add column if not exists versements int generated always as
    ((served_count * meal_price * versements_pct) / 100) stored,
  add column if not exists cantiniere_salary int generated always as
    (served_count * cantiniere_per_meal) stored,
  add column if not exists employer_share int generated always as
    ((served_count * meal_price * employer_subsidy_pct) / 100) stored,
  add column if not exists payer_share int generated always as
    (served_count * meal_price - (served_count * meal_price * employer_subsidy_pct) / 100) stored,
  add column if not exists local_fund int generated always as
    (served_count * meal_price
      - (served_count * meal_price * versements_pct) / 100
      - served_count * cantiniere_per_meal) stored;

-- 3. Réceptions : sources PAM et achats locaux, poids en kg ------------------
alter table public.supply_receptions
  drop constraint if exists supply_receptions_source_check;

alter table public.supply_receptions
  add constraint supply_receptions_source_check
  check (source in ('gouvernement', 'pam', 'communaute', 'organisation', 'achats_locaux'));

alter table public.supply_receptions
  add column if not exists weight_kg numeric(12, 2);

-- 4. Indicateurs d'impact PAM (lecture seule pour les utilisateurs) ----------
create table if not exists public.impact_indicators (
  key text primary key,
  label text not null,
  value numeric not null,
  target numeric,
  unit text,
  note text,
  updated_at timestamptz not null default now()
);

alter table public.impact_indicators enable row level security;

drop policy if exists impact_select on public.impact_indicators;
create policy impact_select on public.impact_indicators
  for select to authenticated
  using (true);

-- 5. Bascule d'établissement pour la démonstration ---------------------------
create or replace function public.list_demo_schools()
returns table (id uuid, name text, model text, meal_price int, city text)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.model, s.meal_price, s.city
  from public.schools s
  where exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('gerant', 'directeur', 'conseiller_dcs')
  )
  order by s.created_at
$$;

create or replace function public.switch_active_school(p_school uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_school public.schools;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null or v_role not in ('gerant', 'directeur') then
    raise exception 'Bascule réservée aux profils de gestion';
  end if;

  select * into v_school from public.schools where id = p_school;
  if v_school.id is null then
    raise exception 'Établissement inconnu';
  end if;

  update public.profiles set school_id = p_school where id = auth.uid();

  return jsonb_build_object(
    'school_id', v_school.id,
    'name', v_school.name,
    'model', v_school.model
  );
end;
$$;

grant execute on function public.list_demo_schools() to authenticated;
grant execute on function public.switch_active_school(uuid) to authenticated;
