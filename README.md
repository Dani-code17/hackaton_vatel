# 🍽️ Cantine de Vatel

> Application web de gestion de cantine scolaire et d'entreprise.
> **Hackathon Vatel 2026** — 10 heures de conception, développement et déploiement.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_+_Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Déploiement](https://img.shields.io/badge/Déploiement-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)

---

## 📌 Présentation

Chaque midi, les cantines scolaires et d'entreprise font face aux mêmes difficultés :
files d'attente interminables, gaspillage alimentaire, régimes et allergies mal pris en
compte, menus peu visibles et gestion encore souvent manuelle.

**Cantine de Vatel** centralise tout le parcours du repas dans une application **pensée
mobile-first** : les convives consultent les menus et réservent leur repas depuis leur
téléphone, les parents pilotent le compte de leur enfant, et le gérant sait à l'avance
combien de repas préparer.

### Le problème résolu

| Problème constaté | Réponse apportée |
| --- | --- |
| Longues files d'attente à midi | Réservation à l'avance + pass QR code à valider au comptoir |
| Gaspillage alimentaire | Nombre de repas connu à l'avance, ajustement des stocks |
| Régimes et allergies ignorés | Profil alimentaire, filtrage des menus et alerte allergie |
| Manque de transparence (menus, tarifs) | Menu de la semaine et prix consultables en un clic |
| Gestion manuelle fastidieuse | Tableau de bord temps réel et statistiques automatiques |

### Les profils utilisateurs

| Profil | Besoins couverts |
| --- | --- |
| 🎓 **Élève / Employé** | Consulter le menu de la semaine, réserver un repas, payer sans espèces, suivre son solde et son historique, signaler ses allergies |
| 👨‍👩‍👧 **Parent** | Recharger le compte cantine de son enfant, suivre ce qu'il mange, recevoir une alerte de solde bas |
| 💼 **Administrateur (gérant)** | Créer et modifier les menus, visualiser les commandes du jour en temps réel, gérer les stocks, consulter un tableau de bord statistique |

Le terrain impose deux profils supplémentaires, implémentés dans la même application :

| Profil | Besoins couverts |
| --- | --- |
| ✍️ **Directeur** | Valider et signer électroniquement la fiche école, l'assiduité et le journal comptable |
| 🛰️ **Conseiller DCS** | Contrôler à distance plusieurs écoles : stocks, preuves photos d'hygiène, état des versements |

### Périmètre livré

**MVP — fonctionnel**

- [x] Connexion sécurisée (Supabase Auth) avec redirection par rôle
- [x] **Inscription en libre-service** (élève ou parent) via l'Edge Function `signup`
- [x] Consultation du menu de la semaine
- [x] Réservation d'un repas avec débit automatisé du solde
- [x] Affichage du solde et de l'historique des mouvements
- [x] Création, **modification** (prix, allergènes, capacité, date) et suppression des menus (gérant)
- [x] Visualisation des commandes du jour en temps réel
- [x] Tableau de bord avec statistiques de base

**Bonus — livrés**

- [x] Paiement Mobile Money **simulé** (Wave / Orange Money) — aucun flux réel
- [x] Pass QR code à valider au comptoir, avec alerte allergies
- [x] Notifications **en temps réel dans l'application** (flux Supabase Realtime, pas de push)
- [x] Notation des plats
- [x] Mise en cache locale du menu (mode faible connexion)

**Spécificités terrain (cahier gérant / DCS)**

- [x] Calculateur de rations qui décrémente le stock automatiquement
- [x] Réception des vivres par origine (Gouvernement, Communauté, Organisation)
- [x] Inventaire et état du matériel de cuisine
- [x] Comptabilité journalière automatique (25 F / 40 % / 5 F)
- [x] Signature électronique du journal et de la fiche école par le directeur
- [x] Contrôle hygiène à distance avec photo horodatée
- [x] Supervision multi-établissements pour le conseiller DCS
- [x] Export CSV de la fiche d'assiduité
- [x] **Multi-modèles d'établissement** (public DCS/PAM, privé, entreprise)
- [x] **Indicateur d'impact PAM** (couverture 73/120 → 98/120 jours)
- [x] Achats locaux en kg/tonnes auprès des groupements agricoles

### Multi-modèles d'établissement

Le cahier des charges couvre trois terrains différents, servis par la même application.
Un sélecteur dans l'en-tête bascule d'un modèle à l'autre en un clic.

| Modèle | Tarif | Calcul financier | Identité |
| --- | --- | --- | --- |
| **Cantine publique DCS / PAM** (EPP GBT) | 25 FCFA | Recette, versements 40 %, cantinière 5 F/plat, fonds local | Bleu marine |
| **École privée / Supérieur** (Cantine de Vatel) | 1 500 FCFA | 100 % payé par les familles, marge de fonctionnement | Bleu ciel |
| **Cantine d'entreprise** (Groupe ACMC) | 1 000 FCFA | Subvention employeur 50 % / part salarié 50 % | Acier |

Concrètement :

- Les **colonnes du journal comptable** et les **libellés** changent selon le modèle.
- En cantine d'entreprise, le salarié n'est débité que de **sa part** (500 F pour un plat à 1 000 F).
- Les **sources d'approvisionnement** proposées à la réception diffèrent (Gouvernement/DCS, PAM,
  groupements de producteurs locaux, fournisseur).
- L'indicateur **Impact PAM** n'apparaît que sur le modèle public et dans la supervision.

### Super-App : trois univers dans une application

Le sélecteur d'établissement est devenu un **portail à 3 univers** (bouton 9 points en haut
à droite → « Sélecteur d'Univers » → écran de transition « Chargement de l'espace… »).
Chaque univers possède sa palette, son vocabulaire et sa barre de navigation.

| Univers | En-tête | Accents | Fond | Navigation basse |
| --- | --- | --- | --- | --- |
| **Vatel Campus** (défaut) | `#072A5D` | `#FF675B` / `#89C2EA` | `#F4F7FA` | Carte · Pass QR · Solde & Wave · Gestion Chef |
| **EPP GBT — DCS / PAM** | `#065F46` | `#D97706` | `#FFFBEB` | Cahier 25F · Rations & Stock · Hygiène Live · Supervision PAM |
| **ACMC Entreprise** | `#0F172A` | `#2563EB` | `#F8FAFC` | Menu Express · Badge 50% · Portail RH |

- Titres : « VATEL • Cantine Campus Abidjan », « CANTINES SCOLAIRES GBT • Suivi DCS & PAM »,
  « ACMC CORPORATE • Restauration Salariés ».
- Les couleurs passent par des **variables CSS** (`[data-universe="…"]` dans `src/index.css`) :
  les mêmes utilitaires Tailwind (`bg-brand-900`, `bg-coral-500`, `bg-shell`) changent de teinte
  sans qu'aucune page ne soit dupliquée.
- Le rôle `conseiller_dcs` est toujours rattaché à l'univers GBT.
- Un bouton **Modules** (⋯) reste disponible pour ne jamais perdre l'accès aux huit écrans du
  cahier de gestion.
- Les étudiants et parents n'ont pas le sélecteur : seuls gérant et directeur peuvent basculer,
  et la RLS Supabase continue de cloisonner les données par établissement.

### Indicateur d'impact PAM

| Donnée | Valeur |
| --- | --- |
| Couverture année scolaire | **73 / 120 jours** (moyenne nationale PAM) |
| Projection avec optimisation des stocks | **98 / 120 jours** (+25 jours gagnés) |
| Élèves couverts | **194 797** |
| Achats locaux | **489,6 t** |

La projection est calculée à partir des **achats locaux réellement saisis** (kg) rapportés au
besoin journalier de l'établissement, plafonnée à 25 jours comme dans le référentiel PAM.

### Bilingue FR / EN

Un sélecteur **FR | EN** est présent dans l'en-tête de chaque univers (et sur l'écran de
connexion). La langue est mémorisée dans le navigateur et appliquée instantanément à :

- la navigation basse et le portail des modules ;
- les titres d'écran, les boutons d'action et les statuts (`Réservé` → `Booked`) ;
- les alertes allergènes du comptoir et de la carte ;
- les libellés comptables (recette 25 F, versements 40 %, salaire cantinière 5 F) ;
- les indicateurs PAM (couverture, projection, achats locaux) ;
- le format des dates et des nombres (`samedi 21 novembre` → `Saturday 21 November`).

L'implémentation tient dans `src/i18n/translations.js` (dictionnaire FR/EN),
`src/i18n/language.js` (`translate`, `useLanguage`) et `src/context/LanguageProvider.jsx`.
Une clé manquante en anglais retombe automatiquement sur le français.

### Assistant IA « Vatel Smart Chef & Anti-Gaspillage »

Deux cartes exploitent l'API officielle **DeepSeek** (`https://api.deepseek.com/chat/completions`,
modèle `deepseek-chat`) via `src/services/deepseekAI.js` :

| Carte | Où | Ce qu'elle fait |
| --- | --- | --- |
| **Vatel Smart Chef IA** | Carte du jour (élève / salarié) | Reçoit le profil d'allergies, le solde, les plats disponibles et la langue active ; renvoie le plat le plus sûr avec un score de compatibilité et une justification courte. Bouton « Actualiser le conseil IA ». |
| **Prédiction IA Anti-Gaspillage** | Tableau de bord du gérant | Analyse l'historique des repas servis et les stocks pour estimer les rations du lendemain et lister les risques de rupture (riz, sardines, huile). |

- La clé **n'est jamais committée** et **n'est pas incluse dans le bundle** : le navigateur
  appelle la fonction Edge `deepseek` (`supabase/functions/deepseek`), déployée sur le projet
  et dont le secret `DEEPSEEK_API_KEY` est stocké côté Supabase.
  > ⚠️ Toute variable `VITE_*` est compilée dans le bundle JS : **ne pas définir
  > `VITE_DEEPSEEK_API_KEY` sur Vercel**. Cette variable ne sert qu'au développement local,
  > en repli si le proxy n'est pas disponible.
  > Vérifié : sans cette variable, l'appel part bien vers
  > `/functions/v1/deepseek` (HTTP 200) et aucune requête ne part vers `api.deepseek.com`.
- **Repli silencieux** : sans secret, en cas d'échec réseau ou de quota, un moteur local
  (`localMealAdvice`, `localRationForecast`) prend le relais sans message d'erreur. La démo
  fonctionne donc hors ligne, et la carte indique simplement la source (`DeepSeek` ou
  `Moteur local`).

### Qualité : tests unitaires métier

`npm run test` (Vitest) exécute `src/tests/businessLogic.test.js` sur les règles pures de
`src/lib/business.js` — les mêmes formules que les colonnes générées PostgreSQL :

| Test | Vérification |
| --- | --- |
| Comptabilité EPP GBT | 200 rationnaires × 25 F = 5 000 F → 2 000 F versements (40 %), 1 000 F cantinière (5 F/plat), 2 000 F condiments |
| Calculateur de rations | 140 rationnaires → 21 kg de riz, 35 boîtes de sardines, 2,1 L d'huile |
| Partage ACMC | 1 000 F à 50 % → 500 F employeur / 500 F salarié, borné entre 0 et 100 % |
| Allergies | un plat contenant un allergène déclaré est détecté (casse et espaces ignorés) et écarté de la recommandation |
| Prévision | moyenne pondérée des services + détection des ruptures de stock |


---

## 🏗️ Architecture

### Vue d'ensemble

```
┌──────────────────────────────┐
│  Client React (SPA)          │
│  React 19 + Vite 8           │
│  Tailwind CSS 4 — mobile-first│
└───────────────┬──────────────┘
                │  HTTPS  (SDK supabase-js + Row Level Security)
                ▼
┌──────────────────────────────┐
│  Supabase                    │
│  ├─ Auth (email / mot de passe) │
│  ├─ PostgreSQL (Postgres managé) │
│  ├─ Storage (photos de plats)    │
│  └─ Realtime (commandes du jour) │
└──────────────────────────────┘
                │
                ▼
        Déploiement Vercel (build statique + CDN)
```

### Choix techniques et justification
| Brique | Choix | Pourquoi |
| --- | --- | --- |
| Frontend | **React 19 + Vite** | Démarrage instantané, HMR rapide, écosystème maîtrisé |
| Style | **Tailwind CSS 4** | Itération UI très rapide, cohérence visuelle, mobile-first natif |
| Backend / BDD | **Supabase** | PostgreSQL + Auth + Realtime prêts en quelques minutes : sur 10 h, ce temps gagné part directement dans les fonctionnalités notées par le jury |
| Sécurité | **RLS (Row Level Security)** | Les règles d'accès vivent dans la base, pas seulement dans le client |
| Hébergement | **Vercel** | Build continu depuis GitHub et URL publique immédiate pour la démo |

> **Pourquoi pas un backend maison ?** Un serveur Express/Django aurait imposé de développer
> l'authentification, les migrations et les endpoints avant même la première fonctionnalité
> visible. Supabase fournit cette couche immédiatement.

### Charte graphique Vatel

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Principale | `#072A5D` Bleu Marine | En-têtes, navigation, titres |
| Secondaire | `#89C2EA` Bleu Ciel | Badges, accents graphiques, jauges |
| Action | `#FF675B` Corail | Boutons Réserver / Valider / Recharger, alertes allergies |
| Fond | `#F4F7FA` | Arrière-plan général |
| Cartes | `#FFFFFF` | Contenants |
| Typographie | Montserrat (repli Inter, system-ui) | Toute l'interface |

Les jetons sont déclarés une seule fois dans `src/index.css` (`@theme`) puis **surchargés par
univers** via `[data-universe="vatel|gbt|acmc"]`. Les utilitaires `brand-*`, `coral-*`,
`on-accent` et `shell` suivent donc automatiquement l'univers actif. Le logo
« VATEL — Cantine Campus Abidjan » est défini dans `src/components/VatelLogo.jsx`.

> Le corail porte un texte bleu marine : ce couple atteint un contraste de 4,9:1 (conforme
> WCAG AA), là où du blanc sur corail plafonnerait à 2,8:1.

### Arborescence

```
hackaton_vatel/
├── public/
│   └── icons/                 # icônes PWA (192, 512, maskable, apple-touch)
├── src/
│   ├── components/            # shell de navigation + kit UI partagé
│   ├── context/               # Auth, univers (3 cantines), langue, toasts
│   ├── i18n/                  # dictionnaire FR/EN + helper de traduction
│   ├── lib/                   # client Supabase, formats, règles métier pures
│   ├── pages/
│   │   ├── eleve/             # menu, pass repas, compte
│   │   ├── parent/            # suivi de l'enfant, historique
│   │   ├── admin/             # cahier de gestion (8 onglets)
│   │   └── dcs/               # supervision multi-écoles
│   ├── services/              # assistant IA DeepSeek (+ repli local)
│   ├── tests/                 # tests unitaires Vitest des règles métier
│   ├── App.jsx                # routes et gardes par rôle
│   └── index.css              # import Tailwind + thème
├── supabase/migrations/       # schéma, RLS, fonctions et données de démo
├── vercel.json                # build + fallback SPA
└── vite.config.js             # plugins React + Tailwind + PWA
```

### Modèle de données

| Table | Rôle |
| --- | --- |
| `schools` | Établissement, effectif, validation du directeur |
| `profiles` | Rôle applicatif, école, allergies, solde, lien parent/enfant |
| `meals` | Plats du jour, prix, allergènes, capacité |
| `reservations` | Réservation, statut, pass QR unique |
| `wallet_transactions` | Recharges, débits repas, remboursements |
| `meal_ratings` | Notation des plats (1 à 5) |
| `supplies` | Vivres, stock, seuil d'alerte, ration par personne |
| `supply_receptions` / `supply_movements` | Entrées par origine et sorties de stock |
| `daily_accounting` | Comptabilité journalière (colonnes calculées) |
| `kitchen_items` | État du matériel de cuisine |
| `hygiene_checks` | Checklist, score et photo horodatée |
| `attendance_records` | Fiche d'assiduité et évolution des effectifs |

### Règles métier dans la base

- `Recette_Jour = rationnaires × 25 F`
- `Etat_Versements = recette × 40 %`
- `Salaire_Cantiniere = rationnaires × 5 F`
- `Fonds_Fonctionnement_Local = recette − versements − salaire`

Ces valeurs sont des **colonnes générées** PostgreSQL : elles ne peuvent pas être saisies à la
main ni devenir incohérentes.

### Accès par rôle (RLS)

| Rôle | Portée |
| --- | --- |
| `eleve` | Ses réservations, son solde, les menus de son école |
| `parent` | Les données de ses enfants uniquement |
| `gerant` | Écriture sur son établissement (menus, vivres, hygiène, comptabilité) |
| `directeur` | Lecture de son établissement + signature électronique |
| `conseiller_dcs` | Lecture de tous les établissements |

---

## 💻 Installation locale

### Prérequis

| Outil | Version utilisée | Vérification |
| --- | --- | --- |
| Node.js | ≥ 22.12 (LTS) | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | ≥ 2.40 | `git --version` |

### Mise en route

```powershell
# 1. Cloner le dépôt
git clone https://github.com/Dani-code17/hackaton_vatel.git
cd hackaton_vatel

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
copy .env.example .env
#   puis renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 4. Lancer le serveur de développement
npm run dev
```

L'application est alors disponible sur **http://localhost:5173**.

### Scripts disponibles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Prévisualiser le build de production |
| `npm run lint` | Analyse statique du code (oxlint) |
| `npm run test` | Tests unitaires métier (Vitest, 14 cas) |

### Configuration Supabase

Le projet Supabase de démonstration existe déjà : **cantine-vatel** (région `eu-west-3`).
Les valeurs attendues dans `.env` sont :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # ou l'ancienne clé anon (JWT)
VITE_DEEPSEEK_API_KEY=sk-...                # facultatif : sans clé, moteur local
```

Pour repartir d'un projet vierge :

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Récupérer `Project URL` et la clé publique (`publishable` ou `anon`) dans **Project Settings → API**.
3. Les coller dans le fichier `.env` à la racine.

> ⚠️ La clé publique est exposée par conception : la protection des données repose sur les
> politiques **RLS** définies dans PostgreSQL. La clé `service_role` ne doit **jamais**
> apparaître dans le front ni être commitée.

### Base de données

Les migrations SQL sont versionnées dans `supabase/migrations/` et s'appliquent dans l'ordre :

| Fichier | Contenu |
| --- | --- |
| `20261121000100_schema.sql` | Tables, contraintes et colonnes générées |
| `20261121000200_rls.sql` | Row Level Security, helpers et bucket photos |
| `20261121000300_functions.sql` | Fonctions métier et trigger de profil |
| `20261121000400_seed.sql` | École, menus, stocks et comptes de démonstration |
| `20261121000500_parent_reservations.sql` | Correctif d'accès parent → enfant |
| `20261121100000_multi_modeles.sql` | Configuration par établissement, indicateurs PAM, bascule |
| `20261121100100_pointage_config.sql` | Pointage figé sur la configuration du modèle |
| `20261121100200_multi_modeles_donnees.sql` | Trois établissements de démonstration |

Application via le **SQL Editor** du dashboard Supabase ou avec la CLI :

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### PWA et mode faible connexion

L'application est installable (manifest + service worker générés par `vite-plugin-pwa`).
Le service worker n'est actif qu'en production : pour le tester, lancer `npm run build`
puis `npm run preview`.

Le menu de la semaine est mis en cache dans `localStorage` : si le réseau tombe, l'élève
continue de consulter les plats et voit un bandeau « Hors ligne ».

### Déploiement (Vercel)

1. Importer le dépôt GitHub dans Vercel.
2. Framework preset : **Vite** — Build : `npm run build` — Output : `dist`.
3. Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement du projet.
   **Ne pas** ajouter `VITE_DEEPSEEK_API_KEY` : la clé resterait côté serveur via l'Edge Function.
4. Déployer : chaque `git push` redéploie automatiquement.

### Fonctions Edge (Supabase)

| Fonction | Rôle | Déploiement |
| --- | --- | --- |
| `signup` | Inscription confirmée immédiatement, `service_role` côté serveur | `supabase functions deploy signup --no-verify-jwt` |
| `deepseek` | Proxy de l'API DeepSeek, clé dans les secrets | `supabase functions deploy deepseek` puis `supabase secrets set DEEPSEEK_API_KEY=sk-...` |

### Sécurité des données

- **Solde, rôle, établissement et rattachement parent** ne sont plus modifiables par un
  `PATCH` direct : un trigger `guard_profile_sensitive_columns` refuse l'écriture côté client
  (`current_user = 'authenticated'`) et n'autorise que les fonctions `security definer`
  (`recharge_wallet`, `reserve_meal`, `cancel_reservation`, `switch_active_school`).
  Vérifié avec un jeton élève : `PATCH /profiles {balance}` → **403**.
- L'inscription publique ne peut créer que des comptes **élève** ou **parent** : le rôle
  `gerant` / `directeur` / `conseiller_dcs` est ignoré côté serveur pour éviter toute élévation
  de privilèges.
- RLS activée sur toutes les tables métier, avec des helpers `security definer`
  (`my_role()`, `my_school()`, `is_staff()`).

---

## 🔑 Comptes de test pour le jury
Cinq profils sont préchargés. Mot de passe identique pour tous : **`Demo1234!`**
(trois chips sur l'écran de connexion remplissent automatiquement les identifiants).

**Inscription libre-service** : l'onglet « Inscription » de l'écran de connexion crée un compte
élève ou parent (Edge Function `signup` → compte confirmé immédiatement, profil créé par le
trigger `handle_new_user`). Un parent peut rattacher un compte élève existant via l'e-mail.

| Profil | Email | Ce qu'il faut tester |
| --- | --- | --- |
| 🎓 Élève | `eleve@vatel.test` | Menu de la semaine, réservation, pass QR, solde, notation |
| 🎓 Élève (2) | `eleve2@vatel.test` | Second compte pour peupler la file d'attente |
| 👨‍👩‍👧 Parent | `parent@vatel.test` | Suivi de l'enfant, alerte allergie, recharge Wave / Orange Money |
| 💼 Gérant | `gerant@vatel.test` | Menus, commandes du jour, vivres, rations, comptabilité, hygiène |
| ✍️ Directeur | `directeur@vatel.test` | Signature du journal comptable et de la fiche école |
| 🛰️ Conseiller DCS | `dcs@vatel.test` | Supervision à distance des établissements |

### Scénario de démonstration (3 minutes)

1. **Élève** — réserver le repas du jour (1 500 F débités), ouvrir le **pass QR**.
2. **Gérant → Commandes** — la réservation apparaît en temps réel ; cliquer **Pointer** :
   l'alerte allergie s'affiche et la recette du jour est recalculée.
3. **Gérant → sélecteur en haut à droite** — basculer sur **EPP GBT** : les libellés passent
   en 25 F, 40 % de versements, 5 F cantinière, et l'**indicateur PAM 73/120 → 98/120** apparaît.
4. **Gérant → Stock & rations** — saisir 200 rationnaires : le besoin par article est calculé,
   le stock est décrémenté ; un article sous le seuil bloque l'action.
5. **Gérant → Comptabilité** — le journal s'adapte au modèle sélectionné.
6. **Basculer sur Cantine Entreprise** — vérifier la répartition 50 % employeur / 50 % salarié.
7. **Directeur** — signer électroniquement le journal et la fiche école.
8. **Conseiller DCS** — retrouver les trois établissements, les stocks, le score hygiène et
   les statistiques d'impact PAM (194 797 élèves, 489,6 t d'achats locaux).

> Le passage d'un profil à l'autre se fait avec **Quitter** en haut à droite ; la connexion
> prend deux clics grâce aux boutons de démonstration.

---

## 🧪 Qualité

- `npm run lint` (oxlint), `npm run test` (Vitest) et `npm run build` passent avant chaque commit.
- **14 tests unitaires** couvrent la comptabilité 25 F / 40 % / 5 F, le calculateur de rations
  (riz, sardines, huile), le partage employeur / salarié ACMC et le blocage des allergènes.
- Les formules testées sont extraites dans `src/lib/business.js` et reproduisent exactement les
  colonnes générées de PostgreSQL : une seule source de vérité, vérifiable sans base de données.
- Messages de commit conventionnels et explicites (`feat:`, `fix:`, `docs:`, `chore:`).
- Accès aux données contrôlé par RLS, pas seulement par l'interface.
- Calculs financiers délégués à PostgreSQL (colonnes générées) pour éviter toute divergence.
- Branche `main` toujours déployable.

---

## 👥 Équipe

| Rôle | Nom |
| --- | --- |
| Lead développeur / Architecte | Yeo Daniel |

---

## 📄 Contexte du hackathon

Projet réalisé dans le cadre du **Hackathon Vatel 2026** (8h → 18h) d'après le *Guide des
participants Cantine Vatel*.

- Tout le code applicatif est développé **pendant** l'épreuve.
- Les bibliothèques UI et les outils d'assistance (Copilot, etc.) sont autorisés.
- Livrables : dépôt GitHub public, URL de démo en ligne, ce `README.md` et un pitch deck ≤ 10 slides.

### Grille d'évaluation visée

| Critère | Points | Notre priorité |
| --- | --- | --- |
| Fonctionnalité | /30 | Un parcours complet qui fonctionne de bout en bout |
| UX / Design | /20 | Mobile-first soigné, navigation évidente |
| Innovation | /20 | Alerte allergies au comptoir + Mobile Money simulé |
| Qualité du code | /15 | Découpage clair, nommage explicite, RLS en place |
| Présentation | /15 | Démo live avant tout discours technique |

---

## 📞 Contacts

- Organisation générale : d.gourdin@vatel.ci
- Support technique : jdkouassi@acmc-group.com — +225 07 47 97 54 07
