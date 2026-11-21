-- ============================================================
--  11 — Référentiel PAM Côte d'Ivoire 2025 (données sourcées)
-- ============================================================
-- Les indicateurs d'impact ne sont plus des ordres de grandeur : ils
-- reprennent le rapport annuel 2025 du PAM Côte d'Ivoire.
--   · 194 797 élèves bénéficiaires dans 833 écoles
--   · 11 millions de repas servis
--   · 489,6 t de denrées achetées localement (220 écoles, 59 groupements)
--   · 73 jours de couverture en moyenne sur 120 jours scolaires
--   · 240 cuisiniers et responsables de cantines formés

insert into public.impact_indicators (key, label, value, target, unit, note)
values
  ('ecoles_couvertes', 'Écoles concernées', 833, null, 'écoles', 'Programme PAM 2025'),
  ('repas_servis_pam', 'Repas servis', 11000000, null, 'repas', 'Programme PAM 2025'),
  ('ecoles_achats_locaux', 'Écoles approvisionnées localement', 220, null, 'écoles', 'Achats locaux 2025'),
  ('groupements_producteurs', 'Groupements de producteurs', 59, null, 'groupements', 'Achats locaux 2025'),
  ('cuisiniers_formes', 'Cuisiniers et responsables formés', 240, null, 'personnes', 'Hygiène et préparation 2025')
on conflict (key) do update
  set label = excluded.label,
      value = excluded.value,
      target = excluded.target,
      unit = excluded.unit,
      note = excluded.note,
      updated_at = now();

-- Précision des notes existantes : la source est désormais explicite
update public.impact_indicators
   set note = 'Moyenne nationale PAM 2025 (73 j / 120 j)', updated_at = now()
 where key = 'couverture_jours';

update public.impact_indicators
   set note = 'Projection liée aux achats locaux (+25 j)', updated_at = now()
 where key = 'couverture_projetee';

update public.impact_indicators
   set note = 'Élèves bénéficiaires 2025', updated_at = now()
 where key = 'eleves_couverts';

update public.impact_indicators
   set note = 'Denrées achetées localement 2025', updated_at = now()
 where key = 'achats_locaux';

-- Source affichée dans l'application
insert into public.impact_indicators (key, label, value, unit, note)
values ('source_pam', 'Source', 2025, 'rapport', 'Rapport annuel PAM Côte d''Ivoire 2025')
on conflict (key) do update
  set label = excluded.label,
      value = excluded.value,
      unit = excluded.unit,
      note = excluded.note,
      updated_at = now();
