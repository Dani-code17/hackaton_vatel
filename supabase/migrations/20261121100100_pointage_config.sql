-- ============================================================
--  07 — Pointage : fige la configuration du modèle sur la journée
-- ============================================================

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

  insert into public.daily_accounting
    (school_id, service_date, served_count, meal_price,
     versements_pct, cantiniere_per_meal, employer_subsidy_pct)
  select
    v_meal.school_id, v_meal.service_date, 1, v_meal.price,
    s.versements_pct, s.cantiniere_per_meal, s.employer_subsidy_pct
  from public.schools s
  where s.id = v_meal.school_id
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
