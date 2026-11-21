-- ============================================================
--  12 — Offre de fin de service (anti-gaspillage)
-- ============================================================
-- Le gérant peut brader les portions restantes avant la fermeture. Le prix
-- payé est figé sur la réservation, pour que l'annulation rembourse exactement
-- ce qui a été débité — même si l'offre est clôturée entre-temps.

alter table public.reservations
  add column if not exists paid_amount int not null default 0;

update public.reservations r
   set paid_amount = m.price
  from public.meals m
 where m.id = r.meal_id and r.paid_amount = 0;

create table if not exists public.flash_offers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  service_date date not null,
  discount_pct int not null check (discount_pct between 10 and 70),
  ends_at timestamptz not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists flash_offers_school_day_idx
  on public.flash_offers (school_id, service_date);

alter table public.flash_offers enable row level security;

drop policy if exists flash_offers_select on public.flash_offers;
create policy flash_offers_select on public.flash_offers
  for select to authenticated
  using (school_id = public.my_school() or public.my_role() = 'conseiller_dcs');

drop policy if exists flash_offers_write on public.flash_offers;
create policy flash_offers_write on public.flash_offers
  for all to authenticated
  using (public.can_manage_school(school_id))
  with check (public.can_manage_school(school_id));

-- Remise active pour une école et un jour donnés (0 si aucune offre en cours)
create or replace function public.active_discount(p_school_id uuid, p_service_date date)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select f.discount_pct
       from public.flash_offers f
      where f.school_id = p_school_id
        and f.service_date = p_service_date
        and f.closed_at is null
        and f.ends_at > now()
      order by f.created_at desc
      limit 1),
    0)
$$;

grant execute on function public.active_discount(uuid, date) to authenticated;

-- ---------- Réservation : applique la remise et fige le prix payé ----------
create or replace function public.reserve_meal(p_meal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meal public.meals;
  v_profile public.profiles;
  v_res public.reservations;
  v_taken int;
  v_pct int;
  v_price int;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Profil introuvable';
  end if;

  select * into v_meal from public.meals where id = p_meal_id;
  if v_meal.id is null then
    raise exception 'Repas introuvable';
  end if;

  if v_meal.school_id <> v_profile.school_id then
    raise exception 'Ce repas ne concerne pas votre établissement';
  end if;

  select count(*) into v_taken
  from public.reservations
  where meal_id = p_meal_id and status <> 'annulee';

  if v_taken >= v_meal.capacity then
    raise exception 'Plus de place pour ce repas';
  end if;

  v_pct := public.active_discount(v_meal.school_id, v_meal.service_date);
  v_price := greatest(0, round(v_meal.price * (100 - v_pct) / 100.0))::int;

  if v_profile.balance < v_price then
    raise exception 'Solde insuffisant : % FCFA requis', v_price;
  end if;

  insert into public.reservations (user_id, meal_id, paid_amount)
  values (auth.uid(), p_meal_id, v_price)
  returning * into v_res;

  update public.profiles set balance = balance - v_price where id = auth.uid();

  insert into public.wallet_transactions (user_id, amount, kind, method, reference, created_by)
  values (
    auth.uid(),
    -v_price,
    'debit_repas',
    'systeme',
    case when v_pct > 0 then v_meal.name || ' (−' || v_pct || ' %)' else v_meal.name end,
    auth.uid()
  );

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'qr_token', v_res.qr_token,
    'meal', v_meal.name,
    'price', v_price,
    'discount_pct', v_pct,
    'balance', v_profile.balance - v_price
  );
end;
$$;

-- ---------- Annulation : rembourse le montant réellement payé ----------
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
  v_meal public.meals;
  v_refund int;
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if v_res.id is null then
    raise exception 'Réservation introuvable';
  end if;

  if v_res.user_id <> auth.uid() then
    raise exception 'Annulation non autorisée';
  end if;

  if v_res.status <> 'reservee' then
    raise exception 'Seule une réservation active peut être annulée';
  end if;

  select * into v_meal from public.meals where id = v_res.meal_id;

  v_refund := coalesce(nullif(v_res.paid_amount, 0), v_meal.price);

  update public.reservations set status = 'annulee' where id = p_reservation_id;
  update public.profiles set balance = balance + v_refund where id = v_res.user_id;

  insert into public.wallet_transactions (user_id, amount, kind, method, reference, created_by)
  values (v_res.user_id, v_refund, 'remboursement', 'systeme', 'Annulation ' || v_meal.name, auth.uid());

  return jsonb_build_object('refunded', v_refund);
end;
$$;
