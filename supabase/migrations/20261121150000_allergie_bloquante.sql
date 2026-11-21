-- ============================================================
--  13 — Allergie bloquante à la réservation
-- ============================================================
-- Un élève ne peut plus réserver un plat qui contient un allergène qu'il a
-- déclaré. Le contrôle est fait côté base : l'interface ne fait qu'afficher
-- l'interdiction, elle ne peut pas être contournée par un appel direct.

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
  v_conflict text;
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

  -- Allergène déclaré présent dans le plat : réservation refusée
  select a into v_conflict
  from unnest(coalesce(v_meal.allergens, '{}'::text[])) as a
  where lower(trim(a)) = any (
    select lower(trim(x)) from unnest(coalesce(v_profile.allergies, '{}'::text[])) as x
  )
  limit 1;

  if v_conflict is not null then
    raise exception 'Plat bloqué : il contient % (allergie déclarée sur votre profil)', v_conflict
      using errcode = '42501';
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
