-- ============================================================
--  01 — Schéma métier : Cantine de Vatel
-- ============================================================

-- ---------- École ----------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  director_name text,
  enrolled_count int not null default 0 check (enrolled_count >= 0),
  validated_at timestamptz,
  validated_by uuid,
  created_at timestamptz not null default now()
);

-- ---------- Profils applicatifs (extension de auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'eleve'
    check (role in ('eleve', 'parent', 'gerant', 'directeur', 'conseiller_dcs')),
  full_name text not null default '',
  school_id uuid references public.schools (id) on delete set null,
  parent_id uuid references public.profiles (id) on delete set null,
  allergies text[] not null default '{}',
  diet text,
  balance int not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);

alter table public.schools
  add constraint schools_validated_by_fkey
  foreign key (validated_by) references public.profiles (id) on delete set null;

-- ---------- Menus ----------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  service_date date not null,
  name text not null,
  description text,
  price int not null default 25 check (price >= 0),
  allergens text[] not null default '{}',
  vegetarian boolean not null default false,
  capacity int not null default 150 check (capacity > 0),
  created_at timestamptz not null default now(),
  unique (school_id, service_date, name)
);

create index meals_service_date_idx on public.meals (school_id, service_date);

-- ---------- Réservations ----------
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  status text not null default 'reservee'
    check (status in ('reservee', 'servie', 'annulee')),
  qr_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  served_at timestamptz,
  unique (user_id, meal_id)
);

create index reservations_meal_idx on public.reservations (meal_id);

-- ---------- Mouvements de solde ----------
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount int not null,
  kind text not null
    check (kind in ('recharge', 'debit_repas', 'remboursement')),
  method text check (method in ('wave', 'orange_money', 'especes', 'systeme')),
  reference text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);

-- ---------- Notation des plats ----------
create table public.meal_ratings (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (meal_id, user_id)
);

-- ---------- Vivres (stock) ----------
create table public.supplies (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  unit text not null default 'kg',
  stock numeric(10, 2) not null default 0 check (stock >= 0),
  min_stock numeric(10, 2) not null default 0,
  -- quantité consommée par rationnaire, exprimée dans l'unité de l'article
  qty_per_person numeric(10, 3) not null default 0 check (qty_per_person >= 0),
  updated_at timestamptz not null default now(),
  unique (school_id, name)
);

-- ---------- Réception des vivres ----------
create table public.supply_receptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete cascade,
  quantity numeric(10, 2) not null check (quantity > 0),
  source text not null
    check (source in ('gouvernement', 'communaute', 'organisation')),
  received_on date not null default current_date,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Mouvement des vivres ----------
create table public.supply_movements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  supply_id uuid not null references public.supplies (id) on delete cascade,
  quantity numeric(10, 2) not null check (quantity > 0),
  kind text not null
    check (kind in ('sortie_repas', 'perte', 'ajustement')),
  rationnaires int check (rationnaires >= 0),
  service_date date not null default current_date,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Comptabilité journalière (25 F / 40 % / 5 F) ----------
create table public.daily_accounting (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  service_date date not null,
  served_count int not null default 0 check (served_count >= 0),
  meal_price int not null default 25 check (meal_price >= 0),
  revenue int generated always as (served_count * meal_price) stored,
  versements int generated always as ((served_count * meal_price * 40) / 100) stored,
  cantiniere_salary int generated always as (served_count * 5) stored,
  local_fund int generated always as
    (served_count * meal_price - (served_count * meal_price * 40) / 100 - served_count * 5) stored,
  signed_at timestamptz,
  signed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (school_id, service_date)
);

-- ---------- Matériel de cuisine ----------
create table public.kitchen_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  quantity int not null default 0 check (quantity >= 0),
  condition text not null default 'bon'
    check (condition in ('bon', 'a_remplacer', 'hors_service')),
  note text,
  updated_at timestamptz not null default now()
);

-- ---------- Contrôle hygiène & magasin ----------
create table public.hygiene_checks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  checked_by uuid references public.profiles (id),
  checked_at timestamptz not null default now(),
  checklist jsonb not null default '[]'::jsonb,
  score int not null default 0 check (score between 0 and 100),
  photo_path text,
  note text
);

-- ---------- Assiduité / effectifs ----------
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  record_date date not null default current_date,
  enrolled int not null default 0 check (enrolled >= 0),
  present int not null default 0 check (present >= 0),
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (school_id, record_date)
);

-- ============================================================
--  Helpers de sécurité (évitent la récursion des politiques RLS)
-- ============================================================
create or replace function public.my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.my_school()
returns uuid
language sql stable security definer set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('gerant', 'directeur', 'conseiller_dcs')
       from public.profiles where id = auth.uid()),
    false)
$$;

create or replace function public.can_manage_school(p_school uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'conseiller_dcs'
            or (role in ('gerant', 'directeur') and school_id = p_school)
       from public.profiles where id = auth.uid()),
    false)
$$;

create or replace function public.can_write_school(p_school uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role = 'gerant' and school_id = p_school
       from public.profiles where id = auth.uid()),
    false)
$$;
