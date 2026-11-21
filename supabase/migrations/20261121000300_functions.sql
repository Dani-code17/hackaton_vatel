-- ============================================================
--  03 — Logique métier (fonctions atomiques)
-- ============================================================

-- ---------- Réservation d'un repas (débit du solde atomique) ----------
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

  if v_profile.balance < v_meal.price then
    raise exception 'Solde insuffisant : % FCFA requis', v_meal.price;
  end if;

  insert into public.reservations (user_id, meal_id)
  values (auth.uid(), p_meal_id)
  returning * into v_res;

  update public.profiles set balance = balance - v_meal.price where id = auth.uid();

  insert into public.wallet_transactions (user_id, amount, kind, method, reference, created_by)
  values (auth.uid(), -v_meal.price, 'debit_repas', 'systeme', v_meal.name, auth.uid());

  return jsonb_build_object(
    'reservation_id', v_res.id,
    'qr_token', v_res.qr_token,
    'meal', v_meal.name,
    'price', v_meal.price,
    'balance', v_profile.balance - v_meal.price
  );
end;
$$;

-- ---------- Annulation avec remboursement ----------
create or replace function public.cancel_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
  v_meal public.meals;
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

  update public.reservations set status = 'annulee' where id = p_reservation_id;
  update public.profiles set balance = balance + v_meal.price where id = v_res.user_id;

  insert into public.wallet_transactions (user_id, amount, kind, method, reference, created_by)
  values (v_res.user_id, v_meal.price, 'remboursement', 'systeme', 'Annulation ' || v_meal.name, auth.uid());

  return jsonb_build_object('refunded', v_meal.price);
end;
$$;

-- ---------- Pointage au comptoir via pass QR ----------
create or replace function public.serve_reservation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
  v_meal public.meals;
  v_profile public.profiles;
begin
  select * into v_res from public.reservations where qr_token = p_token;
  if v_res.id is null then
    raise exception 'Pass inconnu';
  end if;

  select * into v_meal from public.meals where id = v_res.meal_id;

  if not public.can_manage_school(v_meal.school_id) then
    raise exception 'Pointage non autorisé pour cet établissement';
  end if;

  if v_res.status = 'servie' then
    raise exception 'Repas déjà servi';
  end if;

  if v_res.status = 'annulee' then
    raise exception 'Réservation annulée';
  end if;

  select * into v_profile from public.profiles where id = v_res.user_id;

  update public.reservations
     set status = 'servie', served_at = now()
   where id = v_res.id;

  insert into public.daily_accounting (school_id, service_date, served_count)
  values (v_meal.school_id, v_meal.service_date, 1)
  on conflict (school_id, service_date)
  do update set served_count = public.daily_accounting.served_count + 1;

  return jsonb_build_object(
    'ok', true,
    'meal', v_meal.name,
    'student', v_profile.full_name,
    'allergies', to_jsonb(v_profile.allergies),
    'served_at', now()
  );
end;
$$;

-- ---------- Recharge du compte cantine ----------
create or replace function public.recharge_wallet(
  p_user_id uuid,
  p_amount int,
  p_method text default 'wave'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles;
  v_caller public.profiles;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide';
  end if;

  select * into v_target from public.profiles where id = p_user_id;
  if v_target.id is null then
    raise exception 'Compte introuvable';
  end if;

  select * into v_caller from public.profiles where id = auth.uid();

  if not (
    p_user_id = auth.uid()
    or v_target.parent_id = auth.uid()
    or public.can_write_school(v_target.school_id)
  ) then
    raise exception 'Recharge non autorisée';
  end if;

  update public.profiles set balance = balance + p_amount where id = p_user_id;

  insert into public.wallet_transactions (user_id, amount, kind, method, reference, created_by)
  values (p_user_id, p_amount, 'recharge', p_method, 'Recharge cantine', auth.uid());

  return jsonb_build_object('balance', v_target.balance + p_amount);
end;
$$;

-- ---------- Calculateur de rations : décrémente le stock ----------
create or replace function public.apply_rations(
  p_school_id uuid,
  p_rationnaires int,
  p_service_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_consumed numeric(10, 2);
  v_lines jsonb := '[]'::jsonb;
begin
  if not public.can_write_school(p_school_id) then
    raise exception 'Action réservée au gérant de l''établissement';
  end if;

  if p_rationnaires is null or p_rationnaires <= 0 then
    raise exception 'Nombre de rationnaires invalide';
  end if;

  for r in
    select * from public.supplies
    where school_id = p_school_id and qty_per_person > 0
    order by name
  loop
    v_consumed := round(r.qty_per_person * p_rationnaires, 2);

    if r.stock < v_consumed then
      raise exception 'Stock insuffisant pour % (besoin % %, stock %)',
        r.name, v_consumed, r.unit, r.stock;
    end if;

    update public.supplies
       set stock = stock - v_consumed, updated_at = now()
     where id = r.id;

    insert into public.supply_movements
      (school_id, supply_id, quantity, kind, rationnaires, service_date, created_by)
    values
      (p_school_id, r.id, v_consumed, 'sortie_repas', p_rationnaires, p_service_date, auth.uid());

    v_lines := v_lines || jsonb_build_object(
      'supply', r.name,
      'unit', r.unit,
      'consumed', v_consumed,
      'remaining', r.stock - v_consumed
    );
  end loop;

  return jsonb_build_object('rationnaires', p_rationnaires, 'lines', v_lines);
end;
$$;

-- ---------- Signature électronique du directeur ----------
create or replace function public.sign_daily_accounting(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.daily_accounting;
begin
  select * into v_row from public.daily_accounting where id = p_id;
  if v_row.id is null then
    raise exception 'Écriture comptable introuvable';
  end if;

  if not (public.my_role() = 'directeur' and v_row.school_id = public.my_school()) then
    raise exception 'Seul le directeur peut signer ce document';
  end if;

  update public.daily_accounting
     set signed_at = now(), signed_by = auth.uid()
   where id = p_id;

  return jsonb_build_object('signed_at', now());
end;
$$;

-- ---------- Création automatique du profil à l'inscription ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'role' in
      ('eleve', 'parent', 'gerant', 'directeur', 'conseiller_dcs')
    then new.raw_user_meta_data ->> 'role'
    else 'eleve'
  end;

  insert into public.profiles (id, role, full_name, school_id)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    (select id from public.schools order by created_at limit 1)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.reserve_meal(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.serve_reservation(text) to authenticated;
grant execute on function public.recharge_wallet(uuid, int, text) to authenticated;
grant execute on function public.apply_rations(uuid, int, date) to authenticated;
grant execute on function public.sign_daily_accounting(uuid) to authenticated;
