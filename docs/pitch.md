---
title: Cantine de Vatel — pitch deck (10 slides)
author: Équipe Cantine de Vatel
date: Hackathon Restauration Vatel × Epitech — 21 novembre 2026
---

# Pitch deck — Cantine de Vatel

Fichier source du deck. Chaque `---` sépare une slide : importable tel quel dans **Gamma**,
**Marp**, **Google Slides** (via « Importer un Markdown ») ou **PowerPoint** (copier/coller).
Les notes de l'orateur sont en italique sous chaque slide.

Durée cible : **10 minutes** + 5 minutes de questions.
Ordre conseillé : slides 1 → 7 (le cœur), 8 → 10 seulement si le temps le permet.

---

## Slide 1 — Le problème

**À midi, la cantine de Vatel craque.**

- File d'attente de 20 minutes pour 1 200 étudiants sur un créneau de 90 minutes.
- 15 à 20 % des portions préparées ne sont pas consommées.
- Aucun moyen fiable de savoir qu'un élève est allergique avant de lui tendre le plateau.
- Les familles rechargent en espèces, au guichet, aux heures d'ouverture.
- Le gérant tient sa comptabilité sur un cahier papier.

*Note orateur : ne pas parler technique. Une phrase de contexte Vatel Abidjan, puis les cinq
constats. Insister sur le gaspillage et l'allergie : ce sont les deux sujets qui font lever la tête.*

---

## Slide 2 — La solution

**Une seule application, trois gestes : réserver, payer, servir.**

| Geste | Qui | Ce que ça remplace |
| --- | --- | --- |
| Réserver son plat à l'avance | Élève / salarié | La file d'attente |
| Recharger en ligne et suivre ses dépenses | Parent | Le guichet et les espèces |
| Pointer un pass QR avec alerte allergie | Gérant | Le contrôle visuel et le cahier |

*Note orateur : une slide = une idée. Ne pas lire le tableau, montrer l'écran derrière.*

---

## Slide 3 — Démonstration (captures)

**Parcours élève, en 30 secondes.**

1. Connexion → carte du jour avec le solde en très gros.
2. Conseil **Vatel Smart Chef IA** : le plat le plus sûr selon les allergies déclarées.
3. Réservation → débit immédiat → **pass QR**.
4. Comptoir : scan → **« ALLERGIE : POISSON »** s'affiche en rouge, le service est bloqué
   tant que la cuisine n'a pas confirmé.

> Captures à insérer : `01-menu.png` (carte + conseil IA), `02-pass-qr.png` (pass marine + QR),
> `03-comptoir-allergie.png` (alerte bloquante), `04-solde.png` (portefeuille style Wave).

*Note orateur : c'est la slide la plus importante. 2 minutes. Manipuler l'app en direct si la
connexion le permet, sinon ces captures.*

---

## Slide 4 — Le différenciateur : le terrain ivoirien

**Les autres font une cantine. Nous outillons le programme national.**

- **Modèle public DCS / PAM** : 25 F par repas, avec répartition légale automatique
  — 40 % d'état des versements, 5 F par plat pour la cantinière, le reste en condiments.
- **Calculateur de rations** : 180 rationnaires → 27 kg de riz, 45 boîtes de sardines,
  3,6 L d'huile, décrémentés du stock en une opération.
- **Hygiène à distance** : checklist + photo horodatée, score sur 100, consultable par le
  conseiller DCS sans déplacement.
- **Signature électronique** du journal comptable et de la fiche d'assiduité par le directeur.

*Note orateur : c'est ce que personne d'autre n'a dans le hackathon. Le jury doit repartir en se
disant « eux, ils ont parlé à un vrai gérant ».*

---

## Slide 5 — L'impact, avec la source

**Repères nationaux PAM Côte d'Ivoire 2025 — cités dans l'application.**

| Indicateur | Valeur |
| --- | --- |
| Élèves bénéficiaires | 194 797 |
| Écoles concernées | 833 (dont 220 approvisionnées localement) |
| Repas servis | 11 millions |
| Denrées achetées localement | 489,6 t via 59 groupements de producteurs |
| Couverture de l'année scolaire | 73 jours sur 120 |
| Cuisiniers formés à l'hygiène | 240 |

**Notre projection** : les achats locaux saisis dans l'app font passer la couverture de
**73 à 98 jours sur 120** (+25 jours), soit un mois de cantine gagné par école.

> Source : rapport annuel 2025 du PAM Côte d'Ivoire.

*Note orateur : citer la source de tête avant qu'on la demande. C'est ce qui fait la différence
entre un chiffre et une donnée.*

---

## Slide 6 — L'IA ne décore pas, elle décide

**Deux usages réels, un repli hors ligne pour ne jamais tomber en démo.**

- **Vatel Smart Chef** : le profil d'allergies, le solde et les plats du jour sont envoyés au
  modèle ; il renvoie le plat le plus sûr avec un score et une justification en une phrase.
- **Prédiction anti-gaspillage** : l'historique des services et les stocks donnent le nombre
  de rations à préparer demain, plus les ruptures à anticiper (riz, sardines, huile).
- **Offre de fin de service** : le modèle propose la remise et le message pour écouler les
  portions restantes ; l'élève paie le prix remisé, remboursé au centime s'il annule.
- **Sécurité** : la clé vit dans un secret serveur (fonction Edge), jamais dans le navigateur.
- **Robustesse** : si l'API tombe, un moteur local prend le relais sans message d'erreur.

*Note orateur : dire « DeepSeek » seulement si on demande quel modèle. Insister sur la clé côté
serveur : c'est le détail qu'un développeur du jury vérifiera.*

---

## Slide 7 — Architecture et sécurité

```
React 19 + Vite + Tailwind 4 + PWA   ──┐
                                       ├── Supabase (PostgreSQL, Auth, Realtime, Storage)
Fonctions Edge (proxy IA, inscription) ─┘        │
                                                 └── Vercel (déploiement continu)
```

- **PostgreSQL** : solde, répartition comptable et rations calculés par la base
  (colonnes générées, fonctions transactionnelles) — pas dans le navigateur.
- **RLS sur toutes les tables** : un élève ne lit que son établissement.
- **Solde infalsifiable** : un trigger refuse toute écriture directe du solde par un client ;
  seules les fonctions serveur le modifient. *Vérifié : une requête de l'élève sur son propre
  solde est rejetée.*
- **Inscription** : compte élève ou parent uniquement, e-mail confirmé côté serveur.
- **Bilingue FR / EN** : interface, libellés comptables et indicateurs PAM.
- **14 tests unitaires** sur les règles métier (comptabilité 25 F, rations, partage employeur,
  allergènes).

*Note orateur : si un développeur est dans le jury, c'est ici qu'il pose ses questions. Avoir les
réponses prêtes : RLS, RPC, secret côté serveur.*

---

## Slide 8 — Ce qui est livré, ce qui est simulé

**Honnêteté d'abord.**

| Livré et fonctionnel | Simulé / assumé |
| --- | --- |
| Réservation, débit, pass QR, pointage | **Mobile Money simulé** (Wave / Orange Money) : aucun flux réel |
| Alertes allergie bloquantes | Notifications **dans l'application** (temps réel), pas de push |
| Comptabilité 25 F / 40 % / 5 F automatique | Pas de créneaux horaires de retrait (piste suivante) |
| Rations + décrément de stock | Photos de plats : dégradés pour l'instant |
| **Offre de fin de service pilotée par l'IA** (remise + message, prix remisé payé et remboursé au centime) | — |
| Hygiène photo, signature directeur, supervision DCS | — |
| Assistant IA réel + repli local | — |

*Note orateur : annoncer les limites avant qu'on les trouve. Un jury valorise plus l'honnêteté
que le bluff.*

---

## Slide 9 — Roadmap 90 jours

1. **Semaine 1-2** : brancher les API Wave et Orange Money (webhook de confirmation).
2. **Semaine 3-4** : créneaux de retrait avec capacité + notifications push.
3. **Mois 2** : photos de plats et écran cuisine simplifié.
4. **Mois 3** : déploiement sur 10 écoles pilotes DCS, export des documents officiels signés.

*Note orateur : montrer qu'on sait où on va. Une roadmap crédible vaut plus que trois
fonctionnalités de plus.*

---

## Slide 10 — Équipe et appel

**L'équipe** — [noms et rôles]

**Ce que nous demandons** : 10 écoles pilotes du programme DCS/PAM pour mesurer l'effet des
rations calculées sur le gaspillage et la couverture.

**Le message à retenir** :
> 25 F par repas, 194 797 élèves, 73 jours sur 120.
> Nous avons construit l'outil qui fait gagner les 25 jours qui manquent.

*Note orateur : terminer sur la phrase. Ne pas la lire, la dire en regardant le jury.*

---

## Annexe — questions probables et réponses courtes

| Question | Réponse |
| --- | --- |
| « La clé IA est dans le front ? » | Non : secret Supabase, appel via fonction Edge. Vérifiable dans le code. |
| « Un élève peut se créditer ? » | Non : trigger + RLS, testé, la requête est rejetée. |
| « Pourquoi trois univers ? » | Le même socle sert une école publique DCS/PAM, un campus privé et une cantine d'entreprise : c'est le multi-modèle qui rend l'outil revendable. |
| « Où sont les chiffres PAM ? » | Rapport annuel 2025, cité dans l'écran de supervision. |
| « Combien de temps ? » | Une journée, sur une base Supabase gérée. |
| « Et si l'IA tombe ? » | Moteur local, zéro erreur visible, démo garantie. |
