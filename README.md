<div align="center">
  <!-- Remplacer par un vrai screenshot de l'app si possible -->
  <img src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1200&h=400" alt="BarSafe Banner" style="border-radius: 20px; object-fit: cover; width: 100%; max-height: 350px;">
  
  <h1 align="center">🍸 BarSafe Togo</h1>
  <p align="center">
    <strong>La solution SaaS Full-Stack de gestion de bars, restaurants et espaces lounge.</strong>
    <br />
    <em>Transparence financière, gestion des stocks en temps réel et expérience client digitale.</em>
  </p>
</div>

---

## 🌟 Présentation du Projet

**BarSafe** est une application web moderne (SaaS) conçue pour révolutionner la gestion des établissements de nuit et de restauration. Faisant face aux problèmes récurrents de pertes d'inventaire, de fraudes à la caisse et d'inefficacité du service, BarSafe propose un écosystème logiciel complet reliant les clients, les serveurs, les caissiers et la direction via une interface fluide et hautement sécurisée.

Grâce à une architecture Cloud-Native robuste, cette application illustre des compétences avancées en ingénierie logicielle, gestion de bases de données sécurisées et design d'interface utilisateur (UI/UX) premium.

## 🚀 Fonctionnalités Clés par Profil

Le système est divisé en plusieurs accès sécurisés selon le rôle de l'utilisateur :

- **👑 L'Espace Patron (Direction)**
  - **Tableau de bord Analytique :** Chiffre d'affaires en temps réel, alertes de stock bas, top des ventes.
  - **Gestion du Catalogue :** Ajout de produits, paramétrage des prix et gestion dynamique de l'inventaire.
  - **Ressources Humaines :** Génération de tokens d'invitation sécurisés pour enrôler les employés (Serveurs/Caissiers).
  - **Générateur de QR Code :** Création des QR Codes pour la numérisation des tables.

- **🏃 L'Espace Serveur**
  - Prise de commandes numérisée directement à la table.
  - Réception de notifications en temps réel (Appel serveur, nouvelle commande).
  - Suivi des statuts de commandes (En préparation, Servi).

- **💳 L'Espace Caissier**
  - Validation financière sécurisée des commandes.
  - Déduction automatique des stocks lors du paiement, inhibant tout écart d'inventaire.

- **📱 L'Expérience Client (Menu Digital)**
  - Scan de QR code redirigeant vers le menu du bar.
  - Interface e-commerce pour commander depuis son smartphone.
  - Appel direct d'un serveur autorisé depuis la table.

## 💻 Stack Technique & Architecture

BarSafe a été pensé pour la performance, la sécurité et la maintenabilité, utilisant les standards industriels actuels :

### Frontend
* **React 19 & TypeScript :** Développement par composants, typage strict pour une base de code fiable.
* **Vite.js :** Outil de build nouvelle génération pour une performance optimale.
* **TailwindCSS & Vanilla CSS :** Design System personnalisé intégrant du *Glassmorphism* premium et un mode sombre/clair (Dark Mode) natif.
* **Recharts:** Visualisation de données financières et statistiques de ventes.
* **React Router v7 :** Navigation fluide (Single Page Application) avec protection des routes par rôle.

### Backend & Cloud (BaaS)
* **Supabase (PostgreSQL) :** Base de données relationnelle hautement performante.
* **Row Level Security (RLS) :** Politiques de sécurité avancées garantissant l'étanchéité absolue des données entre différents établissements.
* **Fonctions et Triggers SQL :** Automatisation côté serveur pour sécuriser les flux critiques (ex: création automatique de rôles via Token).
* **Supabase Auth :** Gestion d'authentification robuste avec synchronisation de session.

## 🛡️ Focus : Sécurité et Anti-Fraude
Un des défis majeurs dans la restauration est la fraude. Ce projet intègre une approche technique défensive :
* **Découplage des permissions :** Le serveur peut lancer la commande, mais seul le caissier la valide.
* **Stock Verrouillé :** Le stock ne diminue *que* lorsque la commande passe au statut "PAID" (Payé), limitant le vol.
* **RLS (Sécurité au niveau de la ligne) :** Un serveur ou un caissier ne peut lire/écrire que les données de *son propre* établissement (Bar A ne verra jamais Bar B).

## 👩🏽‍💻 À Propos de la Développeuse

**Conçu et développé par Elodie ATANA (Alias: Codorah)**

En tant que **Prompt Ingénieur** et **Développeuse Full-Stack / Intégration IA**, ma mission est de transformer des problèmes métiers complexes en solutions numériques innovantes complètes.  BarSafe est la vitrine de ma capacité à gérer un projet de A à Z : 
- Modélisation de base de données relationnelle complexe.
- Implémentation de logique métier et des politiques restrictives (RLS).
- UX/UI Engineering orienté e-commerce & tableaux de bord.

📧 **Contact :** codorah@hotmail.com  
📞 **Téléphone :** +228 71 67 25 65  
🔗 **LinkedIn :** *[Ajoutez le lien de votre profil ici]*

---
<p align="center">
  <i>Déployé et prêt pour la production.</i>
</p>
