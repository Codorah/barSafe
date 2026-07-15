# 🍸 BarSafe - Product Specification

## 1. Description de l'Application
**BarSafe** est une application web SaaS (Software as a Service) full-stack destinée à la gestion des bars, restaurants et espaces lounge. Elle se positionne comme une solution complète pour digitaliser l'expérience client, optimiser la gestion des commandes et assurer une transparence financière et logistique stricte.

L'objectif principal est de lutter contre les pertes d'inventaire et les fraudes courantes dans le milieu de la restauration de nuit, tout en offrant une interface utilisateur premium et fluide.

## 2. Architecture & Technologies
- **Frontend** : Application React (v19) avec TypeScript, développée en Single Page Application (SPA) grâce à React Router v7. L'interface utilise TailwindCSS pour un design moderne, intégrant des éléments de "Glassmorphism".
- **Backend / BaaS** : Supabase (PostgreSQL) gère l'authentification, le stockage de données et applique une sécurité stricte au niveau des lignes (RLS) pour séparer les données entre les différents établissements (multi-tenant).

## 3. Le Parcours Utilisateur (User Journey)

L'application BarSafe fonctionne sur un système d'accès par rôle (RBAC). Dès l'entrée sur la plateforme, l'utilisateur choisit l'établissement concerné et se connecte (ou accède librement s'il est client).

Voici ce que chaque rôle retrouve lorsqu'il entre dans l'application :

### 📱 L'Expérience Client (Menu Digital)
**Accès** : Souvent déclenché par le scan d'un QR code sur la table (redirection via la route `/b/:barId`).
**Ce qu'on y trouve :**
- **Catalogue interactif :** Un menu digital divisé en catégories (Bière, Sucrerie, Plat, Autre) avec les prix et descriptions.
- **Panier et Commande :** Le client peut sélectionner ses articles, préciser son numéro de table et envoyer sa commande directement.
- **Appel Serveur :** Un bouton "Call Server" permet de notifier instantanément le personnel qu'une assistance est requise à sa table.
- **Suivi basique :** Le client initie la commande, qui passe en statut `EN_ATTENTE`.

### 🏃 L'Espace Serveur (`/serveur`)
**Accès** : Nécessite une connexion avec le rôle `SERVEUR`.
**Ce qu'on y trouve :**
- **Centre de Notifications en Temps Réel :** Des alertes sonores ou visuelles apparaissent lorsqu'un client passe une commande depuis le menu digital ou demande de l'aide à sa table.
- **Prise de commande manuelle :** Le serveur peut lui-même saisir une commande pour un client qui ne souhaite pas utiliser son smartphone.
- **Gestion du Service :** Le serveur voit toutes les commandes en cours (`EN_ATTENTE`) et peut mettre à jour leur statut une fois les boissons/plats livrés (passage au statut `SERVI`).

### 💳 L'Espace Caissier (`/caissier`)
**Accès** : Nécessite une connexion avec le rôle `CAISSIER`.
**Ce qu'on y trouve :**
- **Suivi Financier :** Liste des commandes en attente de paiement (statut `SERVI` ou `EN_ATTENTE`).
- **Validation Sécurisée :** Le caissier valide le paiement (Espèces, Carte, ou Mobile Money).
- **Inhibition de Fraude (Anti-vol) :** C'est *uniquement* au moment où le caissier clique sur "Valider le Paiement" (statut `PAYÉ`) que les stocks des produits sont déduits. Le serveur ne peut pas faire baisser le stock lui-même.

### 👑 L'Espace Patron / Direction (`/patron`)
**Accès** : Nécessite une connexion avec le rôle `PATRON`.
**Ce qu'on y trouve :**
- **Tableau de Bord Analytique (Dashboard) :** Visualisation des statistiques clés en temps réel (chiffre d'affaires, produits les plus vendus, etc.) grâce à des graphiques interactifs (Recharts).
- **Gestion du Stock et Catalogue :** Interface pour ajouter de nouveaux produits, modifier les prix, et surtout faire des réassorts (Ajout de stock). Le système suit le stock initial et le stock courant en temps réel.
- **Suivi des Opérations :** Visibilité complète sur toutes les commandes passées, les statuts et l'activité des serveurs/caissiers.

## 4. Fonctionnalités Clés et Sécurité
1. **Multi-Établissements :** Une seule instance de l'application peut gérer plusieurs bars en même temps, chacun étant totalement isolé grâce au "Row Level Security" de la base de données.
2. **Découplage des Actions :** La séparation claire entre la "prise de commande" (Serveur) et la "validation financière et logistique" (Caissier) empêche les vols d'inventaire.
3. **Synchronisation Temps Réel :** Grâce au store global et à Supabase, toute commande passée par un client s'affiche instantanément sur la tablette du serveur et l'écran du caissier.
