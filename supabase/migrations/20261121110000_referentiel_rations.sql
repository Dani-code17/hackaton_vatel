-- ============================================================
--  09 — Référentiel unique des rations (aligné sur src/lib/business.js)
-- ============================================================
-- Le calculateur affiché dans l'application (aperçu client) et la fonction
-- apply_rations() doivent utiliser exactement les mêmes coefficients :
--   riz 0,150 kg · sardines 0,250 boîte · huile 0,015 L par rationnaire.

update public.supplies s
   set qty_per_person = case s.name
     when 'Riz' then 0.150
     when 'Sardines' then 0.250
     when 'Huile' then 0.015
     else s.qty_per_person
   end
 where s.name in ('Riz', 'Sardines', 'Huile');
