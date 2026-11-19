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

### Les trois profils utilisateurs

| Profil | Besoins couverts |
| --- | --- |
| 🎓 **Élève / Employé** | Consulter le menu de la semaine, réserver un repas, payer sans espèces, suivre son solde et son historique, signaler ses allergies |
| 👨‍👩‍👧 **Parent** | Recharger le compte cantine de son enfant, suivre ce qu'il mange, recevoir une alerte de solde bas |
| 💼 **Administrateur (gérant)** | Créer et modifier les menus, visualiser les commandes du jour en temps réel, gérer les stocks, consulter un tableau de bord statistique |

### Périmètre livré (MVP)

**Obligatoire**
- [ ] Inscription et connexion
- [ ] Consultation du menu de la semaine
- [ ] Réservation d'un repas
- [ ] Affichage du solde et de l'historique
- [ ] Création / modification des menus (admin)
- [ ] Visualisation des commandes du jour (admin)
- [ ] Tableau de bord avec statistiques de base (admin)

**Bonus (si le MVP est terminé)**
- [ ] Paiement Mobile Money simulé (Wave / Orange Money)
- [ ] Pass QR code + alerte allergies au comptoir
- [ ] Notifications en temps réel
- [ ] Notation des plats

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

### Arborescence

```
hackaton_vatel/
├── public/                  # fichiers statiques servis tels quels
├── src/
│   ├── main.jsx             # point d'entrée React
│   ├── App.jsx              # racine de l'application
│   └── index.css            # import Tailwind + thème
├── index.html
├── vite.config.js           # plugins React + Tailwind
├── .env.example             # variables d'environnement attendues
├── .gitignore
└── README.md
```

> Les dossiers `components/`, `pages/`, `lib/`, `hooks/` seront créés au fil du développement
> pendant le hackathon.

---

## 💻 Installation locale

### Prérequis

| Outil | Version utilisée | Vérification |
| --- | --- | --- |
| Node.js | ≥ 20.19 (LTS recommandé) | `node -v` |
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

### Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Récupérer `Project URL` et `anon public key` dans **Project Settings → API**.
3. Les coller dans le fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ La clé `anon` est publique par conception : la protection des données repose sur les
> politiques **RLS** définies dans PostgreSQL. La clé `service_role` ne doit **jamais**
> apparaître dans le front ni être commitée.

### Déploiement (Vercel)

1. Importer le dépôt GitHub dans Vercel.
2. Framework preset : **Vite** — Build : `npm run build` — Output : `dist`.
3. Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement du projet.
4. Déployer : chaque `git push` redéploie automatiquement.

---

## 🔑 Comptes de test pour le jury

Trois comptes de démonstration couvrent les trois profils. Ils seront créés le jour du
hackathon et renseignés ici.

| Profil | Email | Mot de passe | Ce qu'il faut tester |
| --- | --- | --- | --- |
| 🎓 Élève / Employé | `eleve@vatel.test` | `Demo1234!` | Menu de la semaine, réservation, solde, historique |
| 👨‍👩‍👧 Parent | `parent@vatel.test` | `Demo1234!` | Rechargement du compte, suivi des repas, alerte solde bas |
| 💼 Administrateur | `admin@vatel.test` | `Demo1234!` | Création de menu, commandes du jour, tableau de bord |

> Scénario de démonstration recommandé : se connecter en **élève**, réserver le repas du
> jour, puis se connecter en **admin** pour voir la commande apparaître en temps réel.

---

## 🧪 Qualité

- `npm run lint` avant chaque commit.
- Commits réguliers et messages explicites (`feat:`, `fix:`, `docs:`).
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
