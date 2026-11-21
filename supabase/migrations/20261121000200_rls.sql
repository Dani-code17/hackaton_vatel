-- ============================================================
--  02 — Sécurité : Row Level Security + stockage photos
-- ============================================================

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.reservations enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.meal_ratings enable row level security;
alter table public.supplies enable row level security;
alter table public.supply_receptions enable row level security;
alter table public.supply_movements enable row level security;
alter table public.daily_accounting enable row level security;
alter table public.kitchen_items enable row level security;
alter table public.hygiene_checks enable row level security;
alter table public.attendance_records enable row level security;

-- ---------- Écoles ----------
create policy schools_select on public.schools
  for select to authenticated
  using (id = public.my_school() or public.is_staff());

create policy schools_write on public.schools
  for update to authenticated
  using (public.my_role() in ('gerant', 'directeur') and id = public.my_school())
  with check (public.my_role() in ('gerant', 'directeur') and id = public.my_school());

-- ---------- Profils ----------
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or parent_id = auth.uid()
    or public.my_role() = 'conseiller_dcs'
    or (public.is_staff() and school_id = public.my_school())
    or exists (
      select 1 from public.profiles child
      where child.parent_id = auth.uid() and child.id = profiles.id
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or (public.my_role() = 'gerant' and school_id = public.my_school()))
  with check (id = auth.uid() or (public.my_role() = 'gerant' and school_id = public.my_school()));

-- ---------- Menus ----------
create policy meals_select on public.meals
  for select to authenticated
  using (school_id = public.my_school() or public.is_staff());

create policy meals_write on public.meals
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

-- ---------- Réservations (création via fonction reserve_meal) ----------
create policy reservations_select on public.reservations
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.meals m
      where m.id = reservations.meal_id
        and m.school_id = public.my_school()
        and public.is_staff()
    )
  );

create policy reservations_update on public.reservations
  for update to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = reservations.meal_id
        and m.school_id = public.my_school()
        and public.is_staff()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = reservations.meal_id
        and m.school_id = public.my_school()
        and public.is_staff()
    )
  );

-- ---------- Solde ----------
create policy wallet_select on public.wallet_transactions
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_staff()
    or exists (
      select 1 from public.profiles child
      where child.id = wallet_transactions.user_id and child.parent_id = auth.uid()
    )
  );

-- ---------- Notes des plats ----------
create policy ratings_select on public.meal_ratings
  for select to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_ratings.meal_id
        and (m.school_id = public.my_school() or public.is_staff())
    )
  );

create policy ratings_write on public.meal_ratings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Vivres et gestion (gérant écrit, encadrement lit) ----------
create policy supplies_select on public.supplies
  for select to authenticated using (public.can_manage_school(school_id));
create policy supplies_write on public.supplies
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

create policy receptions_select on public.supply_receptions
  for select to authenticated using (public.can_manage_school(school_id));
create policy receptions_write on public.supply_receptions
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

create policy movements_select on public.supply_movements
  for select to authenticated using (public.can_manage_school(school_id));
create policy movements_write on public.supply_movements
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

create policy kitchen_select on public.kitchen_items
  for select to authenticated using (public.can_manage_school(school_id));
create policy kitchen_write on public.kitchen_items
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

create policy hygiene_select on public.hygiene_checks
  for select to authenticated using (public.can_manage_school(school_id));
create policy hygiene_write on public.hygiene_checks
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

create policy attendance_select on public.attendance_records
  for select to authenticated using (public.can_manage_school(school_id));
create policy attendance_write on public.attendance_records
  for all to authenticated
  using (public.can_write_school(school_id))
  with check (public.can_write_school(school_id));

-- ---------- Comptabilité (gérant saisit, directeur signe) ----------
create policy accounting_select on public.daily_accounting
  for select to authenticated using (public.can_manage_school(school_id));

create policy accounting_write on public.daily_accounting
  for all to authenticated
  using (public.my_role() in ('gerant', 'directeur') and school_id = public.my_school())
  with check (public.my_role() in ('gerant', 'directeur') and school_id = public.my_school());

-- ---------- Stockage des photos d'hygiène ----------
insert into storage.buckets (id, name, public)
values ('hygiene-photos', 'hygiene-photos', false)
on conflict (id) do nothing;

create policy hygiene_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hygiene-photos');

create policy hygiene_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'hygiene-photos');
