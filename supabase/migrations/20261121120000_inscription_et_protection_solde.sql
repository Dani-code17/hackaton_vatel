-- ============================================================
--  10 — Inscription publique, protection du solde et rattachement parent
-- ============================================================

-- ---------- 1. Inscription : seuls élève et parent sont publics ----------
-- Les comptes gérant / directeur / conseiller sont créés par l'administration :
-- accepter le rôle envoyé par le client permettrait à n'importe qui de s'octroyer
-- les droits d'administration.
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
    when new.raw_user_meta_data ->> 'role' = 'parent' then 'parent'
    else 'eleve'
  end;

  insert into public.profiles (id, role, full_name, school_id)
  values (
    new.id,
    v_role,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    (select id from public.schools where model = 'prive' order by created_at limit 1)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------- 2. Le solde et le rôle ne sont plus modifiables en direct ----------
-- Les policies `profiles_update_self` autorisent un utilisateur à modifier sa
-- propre ligne (allergies, régime). Sans garde-fou il pouvait aussi écrire
-- `balance`, `role` ou `school_id` en appelant l'API REST directement.
-- Les écritures légitimes passent par des fonctions `security definer`
-- (recharge_wallet, reserve_meal, cancel_reservation, switch_active_school) :
-- dans ce cas `current_user` vaut le propriétaire de la fonction, pas `authenticated`.
create or replace function public.guard_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.balance is distinct from old.balance
     or new.role is distinct from old.role
     or new.school_id is distinct from old.school_id
     or new.parent_id is distinct from old.parent_id then
    raise exception 'Solde, rôle, établissement et rattachement protégés : utilisez les fonctions dédiées'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive on public.profiles;
create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.guard_profile_sensitive_columns();

-- ---------- 3. Rattachement d'un enfant par un parent ----------
create or replace function public.link_child(p_child_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if public.my_role() <> 'parent' then
    raise exception 'Action réservée aux comptes parent';
  end if;

  select p.id
    into v_child
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(u.email) = lower(trim(p_child_email))
     and p.role = 'eleve'
   limit 1;

  if v_child is null then
    raise exception 'Aucun compte élève ne correspond à cette adresse';
  end if;

  update public.profiles
     set parent_id = auth.uid()
   where id = v_child;

  return jsonb_build_object('child_id', v_child);
end;
$$;

grant execute on function public.link_child(text) to authenticated;
