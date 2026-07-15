-- À JOUER DANS LA CONSOLE SUPABASE (SQL Editor) APRÈS LE FICHIER PRECEDENT

-- 1. Ajout de la colonne pour le code d'activation (Invitation token)
-- Ce code sera unique et pourra être donné à l'employé
ALTER TABLE employees ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE;

-- 2. Ajout de l'état "Profil Activé" (boolean : faux tant que le serveur n'a pas mis son mail)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- FIN DE LA REQUÊTE
