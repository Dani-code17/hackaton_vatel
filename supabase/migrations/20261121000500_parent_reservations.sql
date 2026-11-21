-- ============================================================
--  05 — Correction : un parent doit voir les réservations de son enfant
-- ============================================================

drop policy if exists reservations_select on public.reservations;

create policy reservations_select on public.reservations
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles child
      where child.id = reservations.user_id and child.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.meals m
      where m.id = reservations.meal_id
        and m.school_id = public.my_school()
        and public.is_staff()
    )
  );
