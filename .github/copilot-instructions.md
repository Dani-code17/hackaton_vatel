# Conventions du projet — Cantine de Vatel

Instructions persistantes pour l'assistant de développement : stack, architecture,
règles métier et standards de code.

## 1. Environnement & stack technique

- **OS & Terminal :** Windows 11 natif (Terminal **PowerShell** uniquement — pas de WSL ni de commandes Linux/bash).
- **Frontend :** React (Vite) + Tailwind CSS + PWA (`vite-plugin-pwa`) en **Mobile-First**.
- **Backend / BDD :** Supabase (PostgreSQL + Auth + Storage + Realtime).
- **Hébergement :** Vercel (déploiement continu via GitHub).

## 2. Problème résolu

Files d'attente à midi, gaspillage alimentaire, allergies et régimes mal pris en compte,
manque de visibilité sur les menus, gestion encore manuelle.

## 3. Profils utilisateurs

1. **Élève / Employé :** consulter le menu de la semaine, réserver un repas, payer sans
   espèces, suivre son solde et son historique, signaler ses allergies.
2. **Parent :** recharger le compte cantine de son enfant, suivre ce qu'il mange,
   recevoir une alerte de solde bas.
3. **Administrateur (gérant) :** créer et modifier les menus, visualiser les commandes du
   jour en temps réel, gérer les stocks, consulter un tableau de bord statistique.

## 4. Acteurs terrain et rôles applicatifs

- `gerant` : saisit les rationnaires du jour, les mouvements de vivres, la réception des
  stocks et l'audit hygiène (photo live).
- `directeur` : consulte et valide électroniquement (signature) les fiches d'assiduité,
  le rendement scolaire et l'évolution des effectifs.
- `conseiller_dcs` : supervise à distance les écoles (stocks, preuves photos d'hygiène,
  état des versements).
- `parent` / `eleve` : consultation du menu, réservation et pointage des repas, recharge
  du solde (Wave / Orange Money ou espèces).

## 5. Règles de comptabilité journalière

- Prix du repas élève : **25 FCFA**.
- `Recette_Jour` = `Nombre_Rationnaires_Servis * 25`
- `Etat_Versements` = `Recette_Jour * 0.40` (10 FCFA par élève)
- `Salaire_Cantiniere` = `Nombre_Rationnaires_Servis * 5`
- `Fonds_Fonctionnement_Local` = `Recette_Jour - Etat_Versements - Salaire_Cantiniere`
  (10 FCFA par élève)

Ces montants sont des constantes métier : les centraliser à un seul endroit du code.

## 6. Modules du cahier de gestion numérique

1. Fiche École & Effectifs (avec validation du directeur).
2. Réception des Vivres (origine : Gouvernement, Communauté, Organisation externe).
3. Mouvement des Vivres & calculateur de rations (décrémentation automatique du stock).
4. État du Matériel de Cuisine.
5. Comptabilité Journalière & État des Versements (calcul automatique 25 F / 40 % / 5 F).
6. Contrôle Hygiène & Magasin à distance (checklist + photo horodatée).

## 7. Exigences transverses

- **Calculateur de rations :** convertir le nombre de rationnaires (présents ou réservés)
  en quantités exactes d'ingrédients (riz, huile, boîtes de sardines…) et décrémenter le
  stock automatiquement.
- **Dématérialisation administrative :** export des documents officiels — fiche
  d'assiduité, cahier de gestion journalier, suivi des stocks.
- **Supervision à distance :** checklist qualité/hygiène du magasin et de la cuisine avec
  photo horodatée.
- **Offline-First (bonus) :** mise en cache locale (LocalStorage / IndexedDB) pour les
  zones à faible connectivité.

## 8. Fonctionnalités bonus

Paiement simulé Mobile Money (Wave / Orange Money), pass QR code avec alerte allergies au
comptoir, notifications temps réel, notation des plats.

## 9. Standards de code

- **Commandes :** toujours PowerShell (Windows), jamais de bash ni de `&&`.
- **UI :** mobile-first, Tailwind utility-first, pas de CSS ad hoc.
- **Sécurité :** la protection des données repose sur les politiques RLS ; la clé
  `service_role` ne doit jamais apparaître côté client ni dans le dépôt.
- **Secrets :** `.env` et `.vscode/mcp.json` restent hors du dépôt.
- **Commits :** conventionnels et explicites (`feat:`, `fix:`, `docs:`, `chore:`).
- **Qualité :** `npm run lint` avant chaque commit ; `npm run build` doit passer.

## 10. Charte graphique Vatel

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Principale | `#072A5D` Bleu Marine | En-têtes, navigation, titres |
| Secondaire | `#89C2EA` Bleu Ciel | Badges, accents, jauges |
| Action | `#FF675B` Corail | Boutons principaux, alertes allergies |
| Fond | `#F4F7FA` | Arrière-plan général |

- Jetons déclarés dans `src/index.css` (`@theme`) : `brand-50/100/200/300/500/700/900`,
  `coral-100/200/300/500/600/700`, `shell`. Ne jamais écrire une couleur brute dans un composant.
- Typographie Montserrat, repli Inter puis system-ui.
- Texte des boutons corail : bleu marine (`text-brand-900`) pour respecter le contraste AA.
- Logo : composant `VatelLogo` (« VATEL — Cantine Campus Abidjan »).

## 11. Multi-modèles d'établissement

Chaque établissement porte un `model` : `public_dcs`, `prive` ou `entreprise`.

- Les **libellés financiers**, les **sources d'approvisionnement** et l'affichage de
  l'**indicateur PAM** viennent de `src/lib/models.js`. Ne pas dupliquer ces règles dans les pages.
- Les calculs restent en base (`daily_accounting`), avec les paramètres du modèle recopiés
  sur chaque journée : `versements_pct`, `cantiniere_per_meal`, `employer_subsidy_pct`.
- En modèle entreprise, le salarié n'est débité que de sa part (`prix × (100 − subvention) / 100`).
- La bascule d'établissement en démonstration passe par `switch_active_school`, qui met à jour
  `profiles.school_id` ; toutes les politiques RLS suivent ensuite automatiquement.